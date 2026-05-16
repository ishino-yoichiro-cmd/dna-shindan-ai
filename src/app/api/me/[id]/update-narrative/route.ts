// POST /api/me/[id]/update-narrative
// 認証された本人が、自分のナラティブ8問（Q31〜Q38）の回答を編集・追記する。
// `regenerate: true` の時は、回答更新と同時にレポート再生成キューへ投入する（status='received'）。
//
// 認証：access_token または password_hash。
// メール送信：本ルートからは送らない（自動メール一切なし）。
// 既存データへの影響：narrative_answers のキーは「マージ更新」（送られなかった Q キーは保持）。
//   regenerate=false のときは scores / celestial_results / pdf_storage_path 等に触らない。
//   regenerate=true のときは regenerate API と同じ初期化を行う。
//
// レース対策：status='in_progress' の最中に regenerate を要求した場合は 409 を返す。

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const NARRATIVE_KEYS = ['Q31','Q32','Q33','Q34','Q35','Q36','Q37','Q38'] as const;
type NarrativeKey = typeof NARRATIVE_KEYS[number];
const MAX_LEN_PER_ANSWER = 8000;

interface Body {
  token?: string;
  password?: string;
  narrativeAnswers?: Partial<Record<NarrativeKey, string>>;
  regenerate?: boolean;
}

function jsonResp(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return jsonResp({ ok: false, error: '不正なリクエストです' }, 400); }

  const incoming = body.narrativeAnswers;
  if (!incoming || typeof incoming !== 'object') {
    return jsonResp({ ok: false, error: '編集内容が空です' }, 400);
  }
  const cleaned: Record<string, string> = {};
  for (const k of NARRATIVE_KEYS) {
    const v = (incoming as Record<string, unknown>)[k];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed.length > MAX_LEN_PER_ANSWER) {
      return jsonResp({ ok: false, error: k + ' の入力が長すぎます（' + MAX_LEN_PER_ANSWER + '文字以内）' }, 400);
    }
    cleaned[k] = trimmed;
  }
  if (Object.keys(cleaned).length === 0) {
    return jsonResp({ ok: false, error: '編集内容が空です' }, 400);
  }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return jsonResp({ ok: false, error: 'server' }, 500);
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data } = await supa
    .from('dna_diagnoses')
    .select('id, access_token, password_hash, status, narrative_answers')
    .eq('id', id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return jsonResp({ ok: false, error: 'not_found' }, 404);

  let authed = false;
  if (body.token && body.token === row.access_token) authed = true;
  if (!authed && body.password && row.password_hash) {
    authed = await bcrypt.compare(body.password, row.password_hash);
  }
  if (!authed) return jsonResp({ ok: false, error: 'unauthorized' }, 401);

  if (body.regenerate === true && row.status === 'in_progress') {
    return jsonResp({
      ok: false,
      error: '現在レポートを生成中です。完了またはエラーになってから再度お試しください。',
    }, 409);
  }

  const existing = (row.narrative_answers ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existing };
  for (const [k, v] of Object.entries(cleaned)) {
    merged[k] = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {
    narrative_answers: merged,
  };

  if (body.regenerate === true) {
    update.status = 'received';
    update.report_text = null;
    update.pdf_storage_path = null;
    update.email_report_sent_at = null;
    update.completed_at = null;
    update.error_log = null;
  }

  const { error: updErr } = await supa
    .from('dna_diagnoses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq('id', id);

  if (updErr) {
    return jsonResp({ ok: false, error: '保存に失敗しました：' + updErr.message }, 500);
  }

  return jsonResp({
    ok: true,
    regenerated: body.regenerate === true,
    message: body.regenerate === true
      ? '保存しました。新しい回答でレポートを再生成キューに投入しました。10〜20分で完成します。'
      : '保存しました。次回の再生成から反映されます。',
    updatedKeys: Object.keys(cleaned),
  });
}
