// POST /api/admin/hide  body: { id, pass, unhide? }
// 診断レコードを管理画面から非表示（DBは保持）

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? '';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Authorization: Bearer <pass> ヘッダー or body.pass
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerPass = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const pass = bearerPass || (body.pass as string) || '';

  if (!ADMIN_PASS || pass !== ADMIN_PASS) {
    return Response.json({ ok: false, error: '認証に失敗しました。' }, { status: 401 });
  }

  const id = body.id as string;
  if (!id) return Response.json({ ok: false, error: 'id が必要です。' }, { status: 400 });

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return Response.json({ ok: false, error: 'サーバー設定エラーです。' }, { status: 500 });

  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const unhide = body.unhide === true;
  const { error } = await supa
    .from('dna_diagnoses')
    .update({ hidden_at: unhide ? null : new Date().toISOString() })
    .eq('id', id);

  if (error) return Response.json({ ok: false, error: 'DB更新に失敗しました。' }, { status: 500 });

  return Response.json({ ok: true, hidden: !unhide });
}
