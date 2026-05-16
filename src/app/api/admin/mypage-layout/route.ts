// GET   /api/admin/mypage-layout?pass=...           — 現在の layout を返す（未保存なら default）
// PATCH /api/admin/mypage-layout  { pass, layout }  — layout を保存（部分更新は上書き全置換）

import { createClient } from '@supabase/supabase-js';
import { DEFAULT_MYPAGE_LAYOUT, normalizeLayout, parseLayoutFromRow } from '@/lib/mypage-layout';

export const runtime = 'nodejs';

function verifyPass(pass: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPass) return false;
  return pass === adminPass;
}

function getSupabase() {
  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) throw new Error('Supabase 環境変数未設定');
  return createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pass = url.searchParams.get('pass') ?? '';
  if (!verifyPass(pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }
  try {
    const supa = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supa as any)
      .from('dna_system_config')
      .select('value, updated_at')
      .eq('key', 'mypage_layout')
      .maybeSingle();
    const layout = data?.value ? parseLayoutFromRow(data.value) : DEFAULT_MYPAGE_LAYOUT;
    return Response.json({ ok: true, layout, updatedAt: data?.updated_at ?? null });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: { pass?: string; layout?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: '不正なリクエスト' }, { status: 400 });
  }
  if (!body.pass || !verifyPass(body.pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }
  if (!body.layout || typeof body.layout !== 'object') {
    return Response.json({ ok: false, error: 'layout が必要' }, { status: 400 });
  }

  const normalized = normalizeLayout(body.layout);

  try {
    const supa = getSupabase();
    const value = JSON.stringify(normalized);
    const updated_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supa as any)
      .from('dna_system_config')
      .upsert({ key: 'mypage_layout', value, updated_at }, { onConflict: 'key' });
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, layout: normalized, updatedAt: updated_at });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
