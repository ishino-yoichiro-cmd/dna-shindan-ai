/**
 * GET /api/cron/process-monitor
 * Vercel Cron（5分おき: *\/5 * * * *）が叩くcron死活監視エンドポイント。
 *
 * process-pending（毎分実行）が止まっていないか確認する。
 * process-pending は実行のたびに dna_system_config の `process_pending_heartbeat` を更新する。
 * 本エンドポイントはその last_heartbeat から経過時間を確認し、
 * 10分以上更新されていなければ yoisno@gmail.com にアラートを送る。
 *
 * アラート条件：
 *   - heartbeat が存在しない（一度も動いていない）
 *   - heartbeat が 10分以上前（cronが止まっている）
 *
 * 重複通知防止：
 *   - 同じ障害で1時間以内に2回目の通知は送らない
 *   - `process_monitor_last_alert` の timestamp で管理
 */

export const runtime = 'nodejs';

import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email/gmail';

function nowJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace('T', ' ').slice(0, 19) + ' JST';
}

const ALERT_INTERVAL_MS = 60 * 60 * 1000; // 1時間以内の重複通知を抑制
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10分以上更新なし → アラート

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseServiceRoleClient();

    // ── heartbeat 取得 ────────────────────────────────────────────────────────
    const { data: hbRow } = await supabase
      .from('dna_system_config')
      .select('value, updated_at')
      .eq('key', 'process_pending_heartbeat')
      .maybeSingle();

    const lastHeartbeatAt = hbRow?.value ? new Date(hbRow.value) : null;
    const msSinceHeartbeat = lastHeartbeatAt
      ? Date.now() - lastHeartbeatAt.getTime()
      : Infinity;

    const isStale = msSinceHeartbeat > STALE_THRESHOLD_MS;

    if (!isStale) {
      const minAgo = Math.round(msSinceHeartbeat / 60000);
      return Response.json({ ok: true, heartbeat: lastHeartbeatAt?.toISOString(), minAgo });
    }

    // ── 重複アラート抑制チェック ───────────────────────────────────────────────
    const { data: alertRow } = await supabase
      .from('dna_system_config')
      .select('value')
      .eq('key', 'process_monitor_last_alert')
      .maybeSingle();

    const lastAlertAt = alertRow?.value ? new Date(alertRow.value) : null;
    if (lastAlertAt && Date.now() - lastAlertAt.getTime() < ALERT_INTERVAL_MS) {
      return Response.json({ ok: true, suppressed: true, lastAlertAt: lastAlertAt.toISOString() });
    }

    // ── アラートメール送信 ────────────────────────────────────────────────────
    const minStr = Number.isFinite(msSinceHeartbeat)
      ? `${Math.round(msSinceHeartbeat / 60000)}分`
      : '不明（heartbeatが存在しない）';

    const subject = `【DNA診断AI 緊急】process-pending cron が停止している可能性 — ${nowJst()}`;
    const text = `process-pending（毎分実行のcron）が${minStr}間動いていません。\n\n最終heartbeat: ${lastHeartbeatAt?.toISOString() ?? 'なし'}\n現在時刻 (JST): ${nowJst()}\n\n対処:\n1. Vercel Dashboardでcronの実行ログを確認\n2. 手動でcronを叩く: curl -X POST ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/api/process-pending`;

    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:2px solid #dc2626;border-radius:12px;padding:32px;">
    <p style="color:#dc2626;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI — cron 死活監視アラート</p>
    <h1 style="font-size:18px;color:#dc2626;margin:0 0 16px;">process-pending が停止している可能性</h1>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">最終実行</td>
        <td style="padding:6px 0;font-weight:bold;">${lastHeartbeatAt ? lastHeartbeatAt.toISOString().replace('T',' ').slice(0,19)+' UTC' : '記録なし'}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">経過時間</td>
        <td style="padding:6px 0;font-weight:bold;color:#dc2626;">${minStr}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">確認時刻</td>
        <td style="padding:6px 0;">${nowJst()}</td>
      </tr>
    </table>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="font-weight:bold;margin:0 0 8px;font-size:14px;">対処手順：</p>
      <ol style="margin:0;padding-left:20px;font-size:14px;">
        <li>Vercel Dashboard → Cron Jobs でログを確認</li>
        <li>受付中の診断がいれば手動で process-pending を実行</li>
        <li>直近のデプロイでcronが無効化されていないか確認</li>
      </ol>
    </div>
    <p style="text-align:center;margin:0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/admin"
         style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">
        管理画面で確認する
      </a>
    </p>
  </div>
</body></html>`;

    await sendMail({ to: 'yoisno@gmail.com', subject, text, html });

    // アラート送信記録
    await supabase.from('dna_system_config').upsert({
      key: 'process_monitor_last_alert',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, alerted: true, msSinceHeartbeat, checkedAt: nowJst() });

  } catch (e) {
    console.error('[process-monitor]', e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
