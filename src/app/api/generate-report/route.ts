/**
 * POST /api/generate-report — DEPRECATED (410 Gone)
 *
 * 旧アーキテクチャ（diagnoses/reports/celestial_results/scores/narratives テーブル）を参照。
 * 現行は dna_diagnoses テーブルに一本化し、process-pending が直接生成する。
 * フロントエンドからの呼び出しも存在しない。
 * 認証なしでAnthropicAPI（最大5分・13章）を外部起動できるため封鎖する。
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
