// GET /api/cron/auto-finalize-stuck
// Vercel Cron (5分毎) が叩く safety net 自動 finalize エンドポイント。
//
// 越後谷さん（2026-05-16）・吉川さん（2026-05-17）と同じ stuck パターンを自動救済する：
//   status='processing' が 20分以上続き、PDFも全章も揃っているのに L331 UPDATE 到達前で
//   クラッシュしているレコードを検知し、buildCloneSystemPrompt 相当を Postgres 側で
//   組み立てて status='completed' に強制 finalize する。
//
// 救済条件（全て満たすレコードのみ対象）:
//   - status = 'processing'
//   - updated_at < NOW() - 20分（process-pending の通常完了より十分長い）
//   - pdf_storage_path IS NOT NULL（PDF Storage に upload 済）
//   - jsonb_object_keys(report_text) ≥ 13（全章生成済）
//   - scores IS NOT NULL
//   - celestial_results IS NOT NULL
//   - clone_system_prompt IS NULL（process-pending L331 UPDATE が走り切らなかった証跡）
//
// メール送信: ここでは追加送信しない。
//   - 既に email_report_sent_at が埋まっているケースが多い（吉川さん例）
//   - 万一未送信なら admin の resend-report ボタンで YO が手動送信
//
// 認証: Vercel Cron は Authorization: Bearer ${CRON_SECRET} を付ける。
//      env 未設定はローカル開発用に許容（process-monitor と同じパターン）。

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const STUCK_THRESHOLD_MIN = 20;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) {
    return Response.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 });
  }
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MIN * 60 * 1000).toISOString();

  // 救済対象抽出: 条件を全て満たすIDのみ
  const { data: stuckRows, error: fetchErr } = await supa
    .from('dna_diagnoses')
    .select('id, email, last_name, first_name, updated_at, report_text')
    .eq('status', 'processing')
    .lt('updated_at', stuckCutoff)
    .not('pdf_storage_path', 'is', null)
    .not('scores', 'is', null)
    .not('celestial_results', 'is', null)
    .is('clone_system_prompt', null)
    .is('hidden_at', null)
    .limit(10);

  if (fetchErr) {
    return Response.json({ ok: false, error: `fetch_error:${fetchErr.message}` }, { status: 500 });
  }

  const candidates = (stuckRows ?? []).filter((r) => {
    // 全13章揃いを確認
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rt = (r as any).report_text;
    if (!rt || typeof rt !== 'object') return false;
    const keys = Object.keys(rt);
    return keys.length >= 13;
  });

  const finalized: Array<{ id: string; email: string; prompt_len: number }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const row of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    // PostgreSQL 側で buildCloneSystemPrompt 相当を構築して UPDATE
    // 越後谷さん・吉川さん救済時と完全同一ロジック
    const { data: upd, error: updErr } = await supa.rpc('finalize_stuck_diagnosis', { _id: r.id })
      .single();
    if (updErr) {
      // RPC 未作成時のフォールバック：execute_sql 相当を行わず、結果は skipped 扱い
      skipped.push({ id: r.id, reason: `rpc_error:${updErr.message}` });
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = upd as any;
    finalized.push({ id: r.id, email: r.email, prompt_len: u?.prompt_len ?? 0 });
  }

  return Response.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    stuckThresholdMinutes: STUCK_THRESHOLD_MIN,
    candidatesFound: candidates.length,
    finalized,
    skipped,
  });
}
