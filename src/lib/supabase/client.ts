/**
 * DNA診断AI — Supabase ブラウザ用クライアント
 *
 * - anon key を使用 (RLS により diagnoses/responses/narratives/empathy_messages_log の
 *   INSERT のみ許可されている)
 * - クライアントコンポーネントから import して使用
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let cached: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '[supabase/client] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。',
    );
  }

  cached = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,         // 匿名診断のためセッション永続化不要
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'dna-shindan-ai/browser',
      },
    },
  });

  return cached;
}

/**
 * 互換用エイリアス。原則 getSupabaseBrowserClient() を使うこと。
 */
export const supabase = (): SupabaseClient<Database> =>
  getSupabaseBrowserClient();
