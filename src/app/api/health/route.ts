// GET /api/health
// 外部サービス疎通確認エンドポイント
// E2Eテスト・監視ツールから叩いてAI生成パイプラインが機能しているかを確認する
// 認証不要（public） — キーの存在チェックのみ。実際にAPIを呼ばないためコスト発生なし

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, { ok: boolean; message: string }> = {};

  // === Supabase 疎通確認 ===
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    checks.supabase = { ok: false, message: 'env missing: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY' };
  } else {
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      const { error } = await client.from('dna_diagnoses').select('id').limit(1);
      checks.supabase = error
        ? { ok: false, message: error.message }
        : { ok: true, message: 'connected' };
    } catch (e) {
      checks.supabase = { ok: false, message: String(e) };
    }
  }

  // === Anthropic API キー存在確認（実API呼び出しなし・コスト0）===
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  checks.anthropic = anthropicKey
    ? { ok: true, message: 'key present' }
    : { ok: false, message: 'ANTHROPIC_API_KEY not set' };

  // === メール設定確認 ===
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  checks.email = (gmailUser && gmailPass)
    ? { ok: true, message: 'gmail credentials present' }
    : { ok: false, message: 'GMAIL_USER / GMAIL_APP_PASSWORD not set' };

  // === CRON_SECRET 設定確認 ===
  checks.cron = process.env.CRON_SECRET
    ? { ok: true, message: 'cron secret present' }
    : { ok: false, message: 'CRON_SECRET not set — process-pending は起動拒否します' };

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  return Response.json(
    {
      ok: allOk,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  );
}
