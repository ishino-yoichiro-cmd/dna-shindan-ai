// POST /api/admin/recompute-scores-celestial
// scores / celestial_results が NULL になってしまったレコードを
// select_answers / narrative_answers / birth_date / birth_time / birth_place_lat,lng から再計算してDBに書き戻す。
//
// 想定ユースケース：誕生日修正など admin 操作で誤ってクリアしてしまった場合の補完。
// 認証：Authorization: Bearer <ADMIN_PASSWORD>
// Body: { id: string }

import { createClient } from '@supabase/supabase-js';
import { runScoring } from '@/lib/scoring';
import { runAllCelestial } from '@/lib/celestial';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASS) {
    return Response.json({ ok: false, error: 'ADMIN_PASSWORD env missing' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerPass = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearerPass !== ADMIN_PASS) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  const id = (body.id ?? '').trim();
  if (!id) return Response.json({ ok: false, error: 'id_required' }, { status: 400 });

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return Response.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 });
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: row, error: fetchErr } = await supa
    .from('dna_diagnoses')
    .select('id, first_name, last_name, select_answers, narrative_answers, birth_date, birth_time, birth_place_lat, birth_place_lng')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return Response.json({ ok: false, error: `fetch_error:${fetchErr.message}` }, { status: 500 });
  if (!row) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;

  if (!r.birth_date) return Response.json({ ok: false, error: 'birth_date_missing' }, { status: 400 });
  if (!r.select_answers) return Response.json({ ok: false, error: 'select_answers_missing' }, { status: 400 });

  // celestial（命術16）再計算
  let celestial: unknown = null;
  try {
    const fullName = [r.last_name, r.first_name].filter(Boolean).join(' ').trim();
    celestial = await runAllCelestial({
      fullName: fullName || undefined,
      birthDate: r.birth_date,
      birthTime: r.birth_time ?? undefined,
      birthPlace: r.birth_place_lat != null && r.birth_place_lng != null
        ? { latitude: Number(r.birth_place_lat), longitude: Number(r.birth_place_lng), timezone: 'Asia/Tokyo' }
        : undefined,
    });
  } catch (e) {
    return Response.json({ ok: false, error: `celestial_failed:${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  // scores（心理16）再計算
  let scores: unknown = null;
  try {
    scores = runScoring({
      selectAnswers: r.select_answers,
      narrativeAnswers: r.narrative_answers ?? undefined,
    });
  } catch (e) {
    return Response.json({ ok: false, error: `scoring_failed:${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  // DB 書き戻し
  const { error: updErr } = await supa
    .from('dna_diagnoses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ scores, celestial_results: celestial } as any)
    .eq('id', id);

  if (updErr) return Response.json({ ok: false, error: `update_failed:${updErr.message}` }, { status: 500 });

  return Response.json({
    ok: true,
    id,
    scores_keys: scores && typeof scores === 'object' ? Object.keys(scores) : null,
    celestial_keys: celestial && typeof celestial === 'object' ? Object.keys(celestial) : null,
  });
}
