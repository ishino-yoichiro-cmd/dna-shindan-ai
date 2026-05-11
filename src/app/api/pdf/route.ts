/**
 * POST /api/pdf — DEPRECATED (410 Gone)
 *
 * PDF生成は process-pending/route.ts が renderToBuffer() を直接呼び出す形に移行済み。
 * lib/pipeline/finalize.ts 経由の旧パイプラインは現在使用されていない。
 * 認証なし・重処理（30ページPDF）でDoS攻撃の標的になるため封鎖する。
 */

export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { error: '廃止されたエンドポイントです。このAPIは利用できません。' },
    { status: 410 },
  );
}

export async function GET() {
  return Response.json(
    { error: '廃止されたエンドポイントです。このAPIは利用できません。' },
    { status: 410 },
  );
}
