/**
 * GET /api/cron/budget-alert
 * Vercel Cron（毎日 00:00 UTC = 09:00 JST）が叩く予算アラートエンドポイント。
 *
 * 動作：
 *   1. dna_diagnoses の api_cost_usd 合計を集計
 *   2. ANTHROPIC_BUDGET_USD と比較し 70% / 90% 閾値チェック
 *   3. 同日に既に送信済みでなければ yoisno@gmail.com にアラートメール送信
 *   4. 送信履歴を dna_system_config テーブルに記録（重複防止）
 *
 * セキュリティ：
 *   - Vercel Cron は Authorization: Bearer ${CRON_SECRET} ヘッダーを付与
 *   - CRON_SECRET env が設定されている場合のみ検証（未設定時はローカル開発用として許容）
 */

export const runtime = 'nodejs';

import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email/gmail';

const THRESHOLDS = [
  { pct: 0.9, level: '90', label: '90%超え — 残り僅か' },
  { pct: 0.7, level: '70', label: '70%超え — 要注意' },
];

function getBudgetUsd(): number {
  const v = process.env.ANTHROPIC_BUDGET_USD;
  if (!v) throw new Error('ANTHROPIC_BUDGET_USD 未設定');
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error('ANTHROPIC_BUDGET_USD が不正な値');
  return n;
}

function todayJst(): string {
  // JST = UTC+9
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  // Vercel Cron 認証（CRON_SECRET が設定されている場合のみ検証）
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseServiceRoleClient();

    // 1. 総コスト集計
    const { data: costRows, error: costErr } = await supabase
      .from('dna_diagnoses')
      .select('api_cost_usd')
      .not('api_cost_usd', 'is', null);

    if (costErr) {
      console.error('[budget-alert] cost query error:', costErr.message);
      return Response.json({ error: costErr.message }, { status: 500 });
    }

    const totalCost = (costRows ?? []).reduce((s, r) => s + (Number(r.api_cost_usd) || 0), 0);
    const budgetUsd = getBudgetUsd();
    const usageRatio = totalCost / budgetUsd;
    const today = todayJst();

    const results: { level: string; sent: boolean; alreadySent: boolean }[] = [];

    for (const threshold of THRESHOLDS) {
      if (usageRatio < threshold.pct) continue;

      const configKey = `budget_alert_${threshold.level}_last_sent`;

      // 2. 本日送信済みか確認
      const { data: configRow } = await supabase
        .from('dna_system_config')
        .select('value')
        .eq('key', configKey)
        .maybeSingle();

      if (configRow?.value === today) {
        results.push({ level: threshold.level, sent: false, alreadySent: true });
        continue;
      }

      // 3. メール送信
      const usedPct = (usageRatio * 100).toFixed(1);
      const remainUsd = (budgetUsd - totalCost).toFixed(2);
      const subject = `【DNA診断AI】API予算アラート — ${threshold.label}（${usedPct}%）`;
      const text = `Gemini API 予算アラート\n\n使用済: $${totalCost.toFixed(4)} / $${budgetUsd} (${usedPct}%)\n残り: $${remainUsd}\n\n管理画面でご確認ください: https://dna-shindan-ai.vercel.app/admin`;
      const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <h1 style="font-size:18px;color:#${threshold.level === '90' ? 'dc2626' : 'c9a44b'};margin:0 0 16px;">
      API予算アラート — ${threshold.label}
    </h1>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">使用済</td>
        <td style="padding:8px 0;font-weight:bold;font-size:14px;">$${totalCost.toFixed(4)} / $${budgetUsd} (${usedPct}%)</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">残り予算</td>
        <td style="padding:8px 0;font-weight:bold;font-size:14px;">$${remainUsd}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">確認日時 (JST)</td>
        <td style="padding:8px 0;font-size:14px;">${today}</td>
      </tr>
    </table>
    <p style="text-align:center;margin:24px 0;">
      <a href="https://dna-shindan-ai.vercel.app/admin"
         style="display:inline-block;background:#0a1f44;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        管理画面を開く
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">このメールは自動送信されています。次のアラートは翌日以降に送信されます。</p>
  </div>
</body></html>`;

      const mailResult = await sendMail({ to: 'yoisno@gmail.com', subject, text, html });

      if (mailResult.ok) {
        // 4. 送信記録を保存（upsert）
        await supabase.from('dna_system_config').upsert({
          key: configKey,
          value: today,
          updated_at: new Date().toISOString(),
        });
        results.push({ level: threshold.level, sent: true, alreadySent: false });
      } else {
        console.error('[budget-alert] sendMail error:', mailResult.error);
        results.push({ level: threshold.level, sent: false, alreadySent: false });
      }
    }

    return Response.json({
      ok: true,
      totalCost: Number(totalCost.toFixed(4)),
      budgetUsd,
      usagePct: Number((usageRatio * 100).toFixed(1)),
      today,
      results,
    });
  } catch (e) {
    console.error('[budget-alert]', e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
