/**
 * GET /api/admin/feedbacks?pass=xxx
 * 管理画面用: 全感想一覧（診断者名付き）を返す
 */
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? '';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerPass = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const pass = bearerPass || (url.searchParams.get('pass') ?? '');

  if (!ADMIN_PASS || pass !== ADMIN_PASS) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return Response.json({ error: 'server' }, { status: 500 });

  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supa
    .from('dna_feedbacks')
    .select(`
      id, message, created_at,
      diagnosis_id,
      dna_diagnoses ( first_name, last_name, clone_display_name, email )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, feedbacks: data ?? [] });
}
