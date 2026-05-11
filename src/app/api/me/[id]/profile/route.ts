// GET /api/me/[id]/profile?token=xxx&password=xxx
// 拡張プロファイル（公開表示名・相性診断履歴）取得
// 認証必須（access_token または password_hash で検証）

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const password = url.searchParams.get('password') ?? '';

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return Response.json({ ok: false, error: 'server' }, { status: 500 });
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 認証チェック（access_token または password）
  if (!token && !password) {
    return Response.json({ ok: false, error: '認証が必要です' }, { status: 401 });
  }

  const { data } = await supa
    .from('dna_diagnoses')
    .select('clone_display_name, match_history, access_token, password_hash')
    .eq('id', id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return Response.json({ ok: false }, { status: 404 });

  // トークン認証
  let authed = false;
  if (token && token === row.access_token) authed = true;
  if (!authed && password && row.password_hash) {
    authed = await bcrypt.compare(password, row.password_hash);
  }
  if (!authed) return Response.json({ ok: false, error: '認証に失敗しました' }, { status: 401 });

  return Response.json({
    ok: true,
    cloneDisplayName: row.clone_display_name ?? null,
    matchHistory: row.match_history ?? [],
  });
}
