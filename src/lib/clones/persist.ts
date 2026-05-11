/**
 * DNA診断AI — 分身AIクローン永続化
 *
 * createCloneRecord(diagnosisId, systemPrompt, opts):
 *   1. clones テーブルに upsert（diagnosis_id を一意キーとして扱う）
 *   2. public_url は env.NEXT_PUBLIC_SITE_URL を基に /clone/[id] を生成
 *   3. 失敗時は throw（呼び出し側 try/catch 前提）
 *
 * Phase 2.5 時点では /clone/[id] エンドポイント自体は未実装。URL文字列だけ生成しておく。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export interface CreateCloneOptions {
  baseUrl?: string; // 省略時は NEXT_PUBLIC_SITE_URL
  client?: SupabaseClient<Database>;
}

export interface CreateCloneResult {
  cloneId: string;
  publicUrl: string;
}

export async function createCloneRecord(
  diagnosisId: string,
  systemPrompt: string,
  opts: CreateCloneOptions = {},
): Promise<CreateCloneResult> {
  const supabase = opts.client ?? getSupabaseServiceRoleClient();

  // ---- 既存レコード探索（upsert 同等。clones に diagnosis_id 一意制約はないので手動）----
  const existing = await supabase
    .from('clones')
    .select('id')
    .eq('diagnosis_id', diagnosisId)
    .maybeSingle();

  let cloneId: string;
  if (existing.data?.id) {
    cloneId = existing.data.id;
    const { error: updErr } = await supabase
      .from('clones')
      .update({ system_prompt: systemPrompt })
      .eq('id', cloneId);
    if (updErr) {
      throw new Error(`[clones/persist] update 失敗: ${updErr.message}`);
    }
  } else {
    const { data: ins, error: insErr } = await supabase
      .from('clones')
      .insert({
        diagnosis_id: diagnosisId,
        system_prompt: systemPrompt,
      })
      .select('id')
      .single();
    if (insErr || !ins?.id) {
      throw new Error(`[clones/persist] insert 失敗: ${insErr?.message ?? 'unknown'}`);
    }
    cloneId = ins.id;
  }

  // ---- public_url を組み立てて UPDATE ----
  const baseUrl = (opts.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
  const publicUrl = baseUrl
    ? `${baseUrl}/clone/${cloneId}`
    : `/clone/${cloneId}`;

  const { error: urlErr } = await supabase
    .from('clones')
    .update({ public_url: publicUrl })
    .eq('id', cloneId);
  if (urlErr) {
    // 致命ではない（id は確定済みなので URL 後付けで OK）
    console.warn(`[clones/persist] public_url 反映失敗: ${urlErr.message}`);
  }

  return { cloneId, publicUrl };
}
