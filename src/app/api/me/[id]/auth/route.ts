// POST /api/me/[id]/auth
// アクセストークンでマイページ認証 + パスワード設定/検証
//
// モード：
//   { token } のみ → トークン認証（初回または first_login_at がまだないとき）
//   { token, setPassword: 'xxxx' } → 初回パスワード設定
//   { password: 'xxxx' } → パスワード認証（2回目以降）
//
// 出力：{ ok: bool, firstName?, status?, hasPdf?, cloneUrl?, needPassword? }

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// 修正5: H-002 — パスワードブルートフォース制限（in-memory、Vercel Function再起動でリセットされるが十分な抑止効果）
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string, id: string): boolean {
  const key = `${ip}:${id}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

interface AuthBody {
  token?: string;
  password?: string;
  setPassword?: string;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: AuthBody;
  try { body = (await req.json()) as AuthBody; } catch { return json({ ok: false, error: 'リクエストの形式が正しくありません。' }, 400); }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ ok: false, error: 'サーバー設定エラーです。時間をおいて再試行してください。' }, 500);
  const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supa
    .from('dna_diagnoses')
    .select('id, status, first_name, last_name, access_token, password_hash, first_login_at, pdf_storage_path, clone_public_url')
    .eq('id', id)
    .maybeSingle();
  if (error) return json({ ok: false, error: 'データの取得に失敗しました。時間をおいて再試行してください。' }, 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return json({ ok: false, error: '診断データが見つかりません。' }, 404);

  // パスワード検証モード
  if (body.password && !body.setPassword) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (checkRateLimit(clientIp, id)) {
      return json({ ok: false, error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。' }, 429);
    }
    if (!row.password_hash) return json({ ok: false, error: 'password_not_set', needPassword: false, needSetup: true });
    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) return json({ ok: false, error: 'パスワードが正しくありません。' }, 401);
    return successResponse(row);
  }

  // トークン認証 + パスワード設定モード
  if (body.token) {
    if (body.token !== row.access_token) return json({ ok: false, error: '認証に失敗しました。' }, 401);
    // 初回パスワード設定
    if (body.setPassword) {
      // OWASP ASVS v4 推奨: 最小8文字
      if (body.setPassword.length < 8) return json({ ok: false, error: 'パスワードは8文字以上で設定してください。' }, 400);
      const hash = await bcrypt.hash(body.setPassword, 10);
      await supa
        .from('dna_diagnoses')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ password_hash: hash, first_login_at: row.first_login_at ?? new Date().toISOString() } as any)
        .eq('id', id);
      return successResponse(row);
    }
    // トークンのみ → 認証OK・パスワード未設定なら needPassword=true
    return successResponse(row, !row.password_hash);
  }

  return json({ ok: false, error: 'トークンまたはパスワードが必要です。' }, 400);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function successResponse(row: any, needPassword = false) {
  return json({
    ok: true,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    hasPdf: !!row.pdf_storage_path,
    cloneUrl: row.clone_public_url ?? `/clone/${row.id}`,
    needPassword,
  });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}
