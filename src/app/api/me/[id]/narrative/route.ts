// GET /api/me/[id]/narrative?token=xxx&password=xxx
// 認証された本人が、自分のナラティブ8問（Q31〜Q38）の現在値を取得する。
// 編集UIのプリフィル用。
//
// 認証：access_token または password_hash。
// 返却：{ ok: true, narrativeAnswers: { Q31?: string, ..., Q38?: string }, status: string, hasPdf: boolean }

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const NARRATIVE_KEYS = ['Q31','Q32','Q33','Q34','Q35','Q36','Q37','Q38'] as const;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const password = url.searchParams.get('password') ?? '';

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return Response.json({ ok: false, error: 'server' }, { status: 500 });
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  if (!token && !password) {
    return Response.json({ ok: false, error: '認証が必要です' }, { status: 401 });
  }

  const { data } = await supa
    .from('dna_diagnoses')
    .select('access_token, password_hash, narrative_answers, status, pdf_storage_path')
    .eq('id', id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });

  let authed = false;
  if (token && token === row.access_token) authed = true;
  if (!authed && password && row.password_hash) {
    authed = await bcrypt.compare(password, row.password_hash);
  }
  if (!authed) return Response.json({ ok: false, error: '認証に失敗しました' }, { status: 401 });

  const raw = (row.narrative_answers ?? {}) as Record<string, unknown>;
  const narrativeAnswers: Record<string, string> = {};
  for (const k of NARRATIVE_KEYS) {
    const v = raw[k];
    if (typeof v === 'string') narrativeAnswers[k] = v;
  }

  return Response.json({
    ok: true,
    narrativeAnswers,
    status: row.status ?? null,
    hasPdf: !!row.pdf_storage_path,
  });
}
