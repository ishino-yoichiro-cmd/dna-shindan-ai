// GET   /api/admin/user/[id]?pass=...                    — 編集対象フィールドを返す
// PATCH /api/admin/user/[id]  { pass, fields:{...} }      — 編集可能フィールドのみ更新

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function verifyPass(pass: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPass) return false;
  return pass === adminPass;
}

// 編集可能フィールド一覧（ホワイトリスト方式）
const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'clone_display_name',
  'clone_system_prompt',
  'report_text',
  'admin_memo',
  'hidden_at',
] as const;
type EditableField = typeof EDITABLE_FIELDS[number];

function getSupabase() {
  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) throw new Error('Supabase 環境変数未設定');
  return createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const pass = url.searchParams.get('pass') ?? '';
  if (!verifyPass(pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }

  try {
    const supa = getSupabase();
    const cols = ['id', 'email', 'access_token', 'completed_at', 'created_at', ...EDITABLE_FIELDS].join(', ');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supa as any)
      .from('dna_diagnoses')
      .select(cols)
      .eq('id', id)
      .maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return Response.json({ ok: false, error: 'not found' }, { status: 404 });
    return Response.json({ ok: true, user: data });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { pass?: string; fields?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: '不正なリクエスト' }, { status: 400 });
  }
  if (!body.pass || !verifyPass(body.pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }
  if (!body.fields || typeof body.fields !== 'object') {
    return Response.json({ ok: false, error: 'fields が必要' }, { status: 400 });
  }

  // ホワイトリスト経由でサニタイズ
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(body.fields)) {
    if (!(EDITABLE_FIELDS as readonly string[]).includes(key)) continue;
    const v = body.fields[key as EditableField];

    if (key === 'hidden_at') {
      // boolean を受け取って timestamp/null に変換、ISO文字列もそのまま受ける
      if (v === true) patch[key] = new Date().toISOString();
      else if (v === false || v === null || v === '') patch[key] = null;
      else if (typeof v === 'string') patch[key] = v;
      else continue;
    } else if (key === 'report_text') {
      // jsonb 型だが scalar 文字列で運用中。string そのままを jsonb として渡す
      if (typeof v === 'string') patch[key] = v;
      else if (v === null) patch[key] = null;
      else continue;
    } else {
      if (typeof v === 'string' || v === null) patch[key] = v;
      else continue;
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ ok: false, error: '更新対象フィールドがありません' }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  try {
    const supa = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supa as any)
      .from('dna_diagnoses')
      .update(patch)
      .eq('id', id)
      .select('id, ' + EDITABLE_FIELDS.join(', '))
      .maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return Response.json({ ok: false, error: 'not found' }, { status: 404 });
    return Response.json({ ok: true, user: data, updatedFields: Object.keys(patch) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
