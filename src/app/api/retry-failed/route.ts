// POST /api/retry-failed
// status='failed' のうち一時的失敗（birth_date_missing でないもの）を
// status='received' に戻して再処理キューに乗せる。
// 最大3回まで（error_log 内の retried_at: カウントで判定）。
//
// ★ stuck-processing recovery も担当 ★
// status='processing' かつ updated_at が20分以上前のレコードは
// タイムアウトによるstuck状態とみなし 'received' に戻す。
// これにより「cron途中でVercel timeout → 永遠にprocessing状態」の詰まりを防ぐ。
//
// process-pending scheduled-task から retry-failed → process-pending の順で叩く。
// CRON_SECRET（Bearerトークン）で認証。

import { createClient } from '@supabase/supabase-js';
import { sendReportMail } from '@/lib/email/gmail';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_RETRY = 3;
// 20分以上processingのままのレコードはタイムアウトとみなす
const PROCESSING_STUCK_MINUTES = 20;

function verifyCronSecret(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  // CRON_SECRET未設定は本番環境での設定漏れ → 外部から無制限にLLM起動されるため拒否
  if (!cronSecret) {
    console.error('[cron-auth] CRON_SECRET未設定 — 本番では起動を拒否します（APIコスト爆発防止）');
    return false;
  }
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ ok: false, error: 'supabase env missing' }, { status: 500 });
  }
  const supa = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── stuck-processing recovery ──
  // 20分以上 status='processing' のまま止まっているレコードを 'received' に戻す
  const stuckThreshold = new Date(Date.now() - PROCESSING_STUCK_MINUTES * 60 * 1000).toISOString();
  const { data: stuckRows } = await supa
    .from('dna_diagnoses')
    .select('id, error_log')
    .eq('status', 'processing')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .lt('updated_at', stuckThreshold as any)
    .limit(10);

  let stuckReset = 0;
  for (const row of stuckRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    const newLog = `${r.error_log ?? ''};stuck_reset:${new Date().toISOString()}`;
    const { error } = await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: 'received', error_log: newLog } as any)
      .eq('id', r.id);
    if (!error) stuckReset++;
  }

  // ── failed レコードのリトライ ──
  const { data: failedRows, error: fetchErr } = await supa
    .from('dna_diagnoses')
    .select('id, error_log, birth_date')
    .eq('status', 'failed')
    .order('created_at', { ascending: true })
    .limit(20);

  if (fetchErr) return Response.json({ ok: false, error: fetchErr.message }, { status: 500 });

  let retried = 0;
  let skipped = 0;
  const details: Array<{ id: string; reason: string }> = [];

  for (const row of failedRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    const errorLog: string = r.error_log ?? '';

    // 永続的失敗（birth_date なし）はスキップ
    if (!r.birth_date || errorLog.includes('birth_date_missing')) {
      skipped++;
      details.push({ id: r.id, reason: 'permanent:birth_date_missing' });
      continue;
    }

    // リトライ上限チェック
    const retryCount = (errorLog.match(/retried_at:/g) ?? []).length;
    if (retryCount >= MAX_RETRY) {
      skipped++;
      details.push({ id: r.id, reason: `max_retry_reached:${retryCount}` });
      continue;
    }

    // received に戻す（error_log にリトライ記録を追記）
    const newLog = `${errorLog};retried_at:${new Date().toISOString()}`;
    const { error: updateErr } = await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: 'received', error_log: newLog } as any)
      .eq('id', r.id);

    if (updateErr) {
      skipped++;
      details.push({ id: r.id, reason: `update_error:${updateErr.message}` });
    } else {
      retried++;
      details.push({ id: r.id, reason: 'reset_to_received' });
    }
  }

  // ── completed & email未送信レコードの再送 ──
  // status='completed' なのに email_report_sent_at が NULL = メール送信失敗した可能性
  // Gmail レート制限や一時障害で取りこぼしたユーザーへ自動再送する
  const { data: unsentRows } = await supa
    .from('dna_diagnoses')
    .select('id, email, first_name, access_token, error_log')
    .eq('status', 'completed')
    .is('email_report_sent_at', null)
    .not('email', 'is', null)
    .not('access_token', 'is', null)
    .order('completed_at', { ascending: true })
    .limit(5);

  let emailResent = 0;
  for (const row of unsentRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    // 再送上限チェック（email_resend: が3回以上あればスキップ）
    const resendCount = ((r.error_log ?? '') as string).split('email_resend:').length - 1;
    if (resendCount >= 3) continue;

    const myPageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/me/${r.id}?token=${r.access_token}`;
    const result = await sendReportMail({ to: r.email, firstName: r.first_name ?? undefined, myPageUrl });
    if (result.ok) {
      await supa
        .from('dna_diagnoses')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ email_report_sent_at: new Date().toISOString() } as any)
        .eq('id', r.id);
      emailResent++;
    } else {
      const newLog = `${r.error_log ?? ''};email_resend:${new Date().toISOString()}:fail:${result.error ?? 'unknown'}`;
      await supa
        .from('dna_diagnoses')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ error_log: newLog } as any)
        .eq('id', r.id);
    }
  }

  return Response.json({ ok: true, retried, skipped, stuckReset, emailResent, details });
}

// Vercel Cron は GET でエンドポイントを呼ぶ → GET でも POST と同じ処理を実行する
export async function GET(req: Request) {
  return POST(req);
}
