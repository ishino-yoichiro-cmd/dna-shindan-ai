// GET /api/admin/send-log?pass=...&limit=20
// 送信履歴一覧を返す

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function verifyPass(pass: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPass) return false;
  return pass === adminPass;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pass = searchParams.get('pass') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '30'), 100);

  if (!verifyPass(pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('email_send_log')
    .select('id, created_at, subject, to_type, sent, failed, total, body_preview, details')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, logs: data ?? [] });
}
