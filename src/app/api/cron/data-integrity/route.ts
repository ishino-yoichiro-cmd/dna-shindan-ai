/**
 * GET /api/cron/data-integrity
 * Vercel Cron（毎朝 22:00 UTC = 07:00 JST）が叩くデータ整合性チェック。
 *
 * 検出する異常:
 *   1. status=completed だが pdf_storage_path が NULL（= PDFダウンロードできない状態）
 *   2. status=received で 30分以上経過（= cronが止まっている可能性）
 *   3. status=processing で 30分以上経過（= stuck状態、retry-failedが拾えていない）
 *
 * 異常があれば yoisno@gmail.com に即時メール通知。
 * 正常なら ok:true を返すだけ（メール不送）。
 *
 * 2026-05-13障害の教訓：
 * - PDFがNULLのまま「completed」になり、ユーザーが「生成中」表示を見続けた事故
 * - このcronが毎朝チェックしていれば夜間中に気づけた
 */

export const runtime = 'nodejs';

import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email/gmail';

function nowJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace('T', ' ').slice(0, 19) + ' JST';
}

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
    const issues: string[] = [];

    // ── 1. completed だが pdf_storage_path IS NULL ──────────────────────────
    const { data: noPdf, error: e1 } = await supabase
      .from('dna_diagnoses')
      .select('id, first_name, last_name, email, completed_at')
      .eq('status', 'completed')
      .is('pdf_storage_path', null)
      .not('id', 'like', 'e2e%'); // E2Eフィクスチャは除外

    if (e1) {
      console.error('[data-integrity] noPdf query error:', e1.message);
    } else if (noPdf && noPdf.length > 0) {
      const rows = noPdf.map(r =>
        `  • ${r.first_name ?? '?'} ${r.last_name ?? ''} <${r.email}> — completed_at: ${r.completed_at ?? '不明'}`
      ).join('\n');
      issues.push(`【PDF未生成 ${noPdf.length}件】status=completed なのに pdf_storage_path=NULL:\n${rows}`);
    }

    // ── 2. received で 30分以上経過 ─────────────────────────────────────────
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckReceived, error: e2 } = await supabase
      .from('dna_diagnoses')
      .select('id, first_name, last_name, email, created_at')
      .eq('status', 'received')
      .lt('created_at', thirtyMinAgo)
      .not('id', 'like', 'e2e%');

    if (e2) {
      console.error('[data-integrity] stuckReceived query error:', e2.message);
    } else if (stuckReceived && stuckReceived.length > 0) {
      const rows = stuckReceived.map(r =>
        `  • ${r.first_name ?? '?'} ${r.last_name ?? ''} <${r.email}> — created_at: ${r.created_at}`
      ).join('\n');
      issues.push(`【処理待ち滞留 ${stuckReceived.length}件】received のまま30分以上経過（cronが止まっている可能性）:\n${rows}`);
    }

    // ── 3. processing で 30分以上経過（stuck）────────────────────────────────
    const { data: stuckProcessing, error: e3 } = await supabase
      .from('dna_diagnoses')
      .select('id, first_name, last_name, email, updated_at')
      .eq('status', 'processing')
      .lt('updated_at', thirtyMinAgo)
      .not('id', 'like', 'e2e%');

    if (e3) {
      console.error('[data-integrity] stuckProcessing query error:', e3.message);
    } else if (stuckProcessing && stuckProcessing.length > 0) {
      const rows = stuckProcessing.map(r =>
        `  • ${r.first_name ?? '?'} ${r.last_name ?? ''} <${r.email}> — updated_at: ${r.updated_at}`
      ).join('\n');
      issues.push(`【処理中スタック ${stuckProcessing.length}件】processing のまま30分以上経過（retry-failedで復旧予定）:\n${rows}`);
    }

    // ── 異常なし → 終了 ──────────────────────────────────────────────────────
    if (issues.length === 0) {
      console.log('[data-integrity] 全件正常');
      return Response.json({ ok: true, issues: 0, checkedAt: nowJst() });
    }

    // ── 異常あり → メール通知 ─────────────────────────────────────────────────
    const body = issues.join('\n\n');
    const subject = `【DNA診断AI データ整合性アラート】${issues.length}件の異常検知 — ${nowJst()}`;
    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:2px solid #dc2626;border-radius:12px;padding:32px;">
    <p style="color:#dc2626;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI — 緊急アラート</p>
    <h1 style="font-size:18px;color:#dc2626;margin:0 0 16px;">データ整合性チェックで異常検知</h1>
    <p style="font-size:14px;margin:0 0 16px;">確認時刻: ${nowJst()}</p>
    ${issues.map(issue => `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:12px;">
      <pre style="margin:0;font-size:13px;white-space:pre-wrap;font-family:monospace;">${issue.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
    </div>`).join('')}
    <p style="text-align:center;margin:24px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/admin"
         style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;">
        管理画面で確認する
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">このメールは毎朝7:00 JSTに自動チェックされます。</p>
  </div>
</body></html>`;

    await sendMail({ to: 'yoisno@gmail.com', subject, text: body, html });

    console.warn(`[data-integrity] ${issues.length}件の異常検知、メール送信済み`);
    return Response.json({ ok: true, issues: issues.length, alerts: issues.map(i => i.split('\n')[0]), checkedAt: nowJst() });

  } catch (e) {
    console.error('[data-integrity] fatal:', e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
