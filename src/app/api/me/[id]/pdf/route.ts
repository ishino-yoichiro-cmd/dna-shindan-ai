// GET /api/me/[id]/pdf?token=xxx&password=xxx
// PDFダウンロード（認証必須）
// token または password のどちらかで認証

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const password = url.searchParams.get('password') ?? '';

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return new Response('サーバー設定エラーです。時間をおいて再試行してください。', { status: 500 });
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data } = await supa
    .from('dna_diagnoses')
    .select('id, access_token, password_hash, pdf_storage_path, first_name')
    .eq('id', id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return new Response('診断データが見つかりません。', { status: 404 });

  // 認証
  let authed = false;
  if (token && token === row.access_token) authed = true;
  if (!authed && password && row.password_hash) {
    authed = await bcrypt.compare(password, row.password_hash);
  }
  if (!authed) return new Response('認証に失敗しました。', { status: 401 });

  if (!row.pdf_storage_path) return new Response('PDFはまだ生成中です。しばらくお待ちください。', { status: 425 });

  // Storage から PDF 取得
  const { data: file, error } = await supa.storage.from('reports').download(row.pdf_storage_path);
  if (error || !file) return new Response('PDFの取得に失敗しました。時間をおいて再試行してください。', { status: 500 });

  // ダウンロード回数記録（fail-safe・失敗してもDLは続行）
  try {
    const { data: cur } = await supa.from('dna_diagnoses').select('download_count').eq('id', id).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = (((cur as any)?.download_count as number) ?? 0) + 1;
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ download_count: next, last_downloaded_at: new Date().toISOString() } as any)
      .eq('id', id);
  } catch (e) {
    console.error('[pdf] dl count update failed', e);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = encodeURIComponent(`dna-shindan-${row.first_name ?? 'report'}.pdf`);
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename*=UTF-8''${safeName}`,
      'cache-control': 'private, no-store',
    },
  });
}
