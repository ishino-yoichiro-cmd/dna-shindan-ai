// POST /api/me/[id]/regenerate
// マイページから「レポート再生成」を起動。status=received に戻して、process-pending待ち
// 認証：password または token

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

interface Body { token?: string; password?: string }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return json({ ok: false }, 400); }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return json({ ok: false }, 500);
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data } = await supa.from('dna_diagnoses').select('id, access_token, password_hash').eq('id', id).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  let authed = false;
  if (body.token && body.token === row.access_token) authed = true;
  if (!authed && body.password && row.password_hash) {
    authed = await bcrypt.compare(body.password, row.password_hash);
  }
  if (!authed) return json({ ok: false, error: 'unauthorized' }, 401);

  await supa
    .from('dna_diagnoses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      status: 'received',
      report_text: null,
      pdf_storage_path: null,
      email_report_sent_at: null,
      completed_at: null,
      error_log: null,
    } as any)
    .eq('id', id);

  return json({ ok: true, message: 'レポート再生成キューに投入しました。10〜20分で完成します。' });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}
