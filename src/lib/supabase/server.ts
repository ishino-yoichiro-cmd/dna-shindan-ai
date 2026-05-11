/**
 * DNA診断AI — Supabase サーバ用クライアント (service role)
 *
 * - service_role key を使用するため、絶対にクライアントへ露出させない。
 * - サーバコンポーネント / Route Handler / Server Action / Edge Function 内でのみ使用。
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * モジュールロード時のシングルトン化はしない:
 * Vercel / Next.js のリクエスト境界で fresh client を作るほうが安全。
 * (ただし呼び出し回数は通常少ないのでパフォーマンス影響は無視できる)
 */
export function getSupabaseServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[supabase/server] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。',
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'dna-shindan-ai/server',
      },
    },
  });
}

/**
 * 互換用エイリアス。
 */
export const supabaseAdmin = (): SupabaseClient<Database> =>
  getSupabaseServiceRoleClient();
