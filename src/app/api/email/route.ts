/**
 * POST /api/email — DEPRECATED (410 Gone)
 *
 * メール送信は process-pending/route.ts が sendReportMail() を直接呼び出す形に移行済み。
 * HTTPエンドポイントとしては使用されていない。
 * 認証なしで任意のdiagnosis_idのメールを外部から再送できるため封鎖する。
 */

export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { error: '廃止されたエンドポイントです。このAPIは利用できません。' },
    { status: 410 },
  );
}
