/**
 * POST /api/sheets — DEPRECATED (410 Gone)
 *
 * Google Sheets書き込みは lib/sheets/appender.ts 経由で直接呼び出す形に移行済み。
 * HTTPエンドポイントとしては使用されていない。
 * 認証なしで外部から呼び出せるため封鎖する。
 */

export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { error: '廃止されたエンドポイントです。このAPIは利用できません。' },
    { status: 410 },
  );
}
