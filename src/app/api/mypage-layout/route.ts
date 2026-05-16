// GET /api/mypage-layout
// マイページから読む公開エンドポイント（認証不要・全ユーザー共通）
// Cache-Control: 5分fresh + 30分stale で配信負荷を抑制

import { createClient } from '@supabase/supabase-js';
import { DEFAULT_MYPAGE_LAYOUT, parseLayoutFromRow } from '@/lib/mypage-layout';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) {
    return Response.json({ ok: true, layout: DEFAULT_MYPAGE_LAYOUT });
  }
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supa as any)
    .from('dna_system_config')
    .select('value')
    .eq('key', 'mypage_layout')
    .maybeSingle();

  const layout = data?.value ? parseLayoutFromRow(data.value) : DEFAULT_MYPAGE_LAYOUT;
  return new Response(JSON.stringify({ ok: true, layout }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // 短めキャッシュ：admin で保存→ユーザーがリロードしたら30秒以内に反映、
      // stale-while-revalidate でその後も負荷を抑制。
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
    },
  });
}
