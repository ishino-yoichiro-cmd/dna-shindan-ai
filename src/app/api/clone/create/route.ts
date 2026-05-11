/**
 * POST /api/clone/create — DEPRECATED (410 Gone)
 *
 * このエンドポイントは旧アーキテクチャ（diagnoses/clones/celestial_results/scores/narratives テーブル）を
 * 参照していたが、現行は dna_diagnoses テーブルに一本化済み。
 * 分身AIのsystem_promptは process-pending/route.ts が直接生成・保存する。
 * セキュリティリスク（認証なし・旧テーブル参照）のため封鎖する。
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
