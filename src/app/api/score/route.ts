// POST /api/score
// 入力：{ answers: Record<questionId, choiceId>, narrative?: Record<string,string> }
// 出力：ScoreResult JSON
// Edge runtime 対応

import { NextRequest } from 'next/server';
import { runScoringFromAnswers } from '@/lib/scoring';

export const runtime = 'edge';

interface RequestBody {
  answers?: Record<string, string>;
  narrative?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const answers = body.answers ?? {};
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return new Response(
      JSON.stringify({ error: 'answers_must_be_record' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const result = runScoringFromAnswers(answers, body.narrative);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/score',
      method: 'POST',
      body: {
        answers: 'Record<questionId, choiceId> 例: { Q5: "A", Q6: "B", ... }',
        narrative: '(optional) Record<questionId, string>',
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}
