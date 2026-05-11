// POST /api/empathy
// 入力：{ questionId, choiceId, choiceText?, currentTopAxes? }
// 出力：{ message: string, source: 'pool' | 'llm' | 'fallback' }
// runtime：nodejs（Anthropic SDK は Node 依存）
//
// 動作モード：
//   1) ANTHROPIC_API_KEY があれば Claude Sonnet 4.6 で動的生成（$0.0005/回想定）
//      → プロンプトキャッシュ適用済み
//   2) なければ事前定義プールからルールベースで返却
//   3) LLM呼び出し失敗時もプールにフォールバックし、必ず1メッセージを返す

import { NextRequest } from 'next/server';
import { SELECT_QUESTIONS, type ScoreDelta } from '@/data/questions';
import { generateEmpathy, hasAnthropicApiKey } from '@/lib/llm';
import type { EmpathyInput } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface RequestBody {
  questionId?: string;
  choiceId?: string;
  choiceText?: string;
  currentTopAxes?: EmpathyInput['currentTopAxes'];
  // forceLlm: true で常にLLM生成（テスト用）
  forceLlm?: boolean;
  // forcePool: true で常にプール返却（テスト用）
  forcePool?: boolean;
}

// 事前定義の共感メッセージプール（cristy作成版から抜粋）
const POOL = {
  o_high: 'その答え、新しいもの好きで好奇心が止まらない人によく出る。退屈に耐えるのが苦手なタイプ。',
  c_high: 'その答え、段取りで安心するタイプの人がよく選ぶ。「準備が9割」を体感で知ってる。',
  e_high: 'その答え、人といると充電されるタイプ。一人時間も嫌いじゃないけど、長くは続かない。',
  e_low: 'その答え、一人時間で回復する人の特徴。賑やかな場が嫌いなんじゃなくて、消耗するだけ。',
  a_high: 'その答え、人の感情の機微を読む人のサイン。優しさが言葉より先に動く。',
  n_high: 'その答え、感受性が深い人にありがち。ざわつきの正体を言語化できる強みがある。',
  ennea4: 'その答え、「みんなと同じ」が一番苦しい人によく出る。普通であることに罪悪感がある。',
  ennea5: 'その答え、観察してから動く人によくある。先に飛び込む人を見て、安全ルートを設計する。',
  ennea7: 'その答え、可能性を広げ続ける人の選び方。一つに絞ることが、ときに苦しい。',
  ennea8: 'その答え、不正を見ると黙れない人の反応。優しいのに、戦うときは退かない。',
  riasecA: 'その答え、美意識で世界を切り取る人の選び方。妥協できない領域が必ずある。',
  riasecS: 'その答え、人の成長に貢献したい人の特徴。自分の幸せより先に誰かを思う。',
  riasecI: 'その答え、構造を理解したい人の癖。「なぜそうなる？」が止まらないタイプ。',
  attach_av: 'その答え、距離を取って自分を保つ人の特徴。べったりされると逆に不安になる。',
  attach_anx: 'その答え、関係性に敏感な人にありがち。相手の小さな変化も拾ってしまう。',
  generic1: 'いまの選択、芯のある答え。考え抜いた末の言葉だと伝わってくる。',
  generic2: 'その答え、自分の感覚を信じてる人の選び方。ブレない軸が見える。',
  generic3: 'いまの選択、けっこう少数派。だからこそ、その立ち位置が個性になる。',
  generic4: 'その答え、25%くらいの人が選ぶ落ち着いた選択肢。バランス感覚が出てる。',
} as const;

function pickFromDelta(delta: ScoreDelta | undefined, qid: string): string {
  if (!delta) return POOL.generic1;
  if (delta.ennea?.E4 && delta.ennea.E4 >= 1) return POOL.ennea4;
  if (delta.ennea?.E5 && delta.ennea.E5 >= 1) return POOL.ennea5;
  if (delta.ennea?.E7 && delta.ennea.E7 >= 1) return POOL.ennea7;
  if (delta.ennea?.E8 && delta.ennea.E8 >= 1) return POOL.ennea8;
  if (delta.attach?.['At-Av'] && delta.attach['At-Av'] >= 1) return POOL.attach_av;
  if (delta.attach?.['At-Anx'] && delta.attach['At-Anx'] >= 1) return POOL.attach_anx;
  if (delta.riasec?.A && delta.riasec.A >= 1) return POOL.riasecA;
  if (delta.riasec?.S && delta.riasec.S >= 1) return POOL.riasecS;
  if (delta.riasec?.I && delta.riasec.I >= 1) return POOL.riasecI;
  if (delta.big5?.O && delta.big5.O >= 2) return POOL.o_high;
  if (delta.big5?.C && delta.big5.C >= 2) return POOL.c_high;
  if (delta.big5?.E && delta.big5.E >= 2) return POOL.e_high;
  if (delta.big5?.E && delta.big5.E <= -2) return POOL.e_low;
  if (delta.big5?.A && delta.big5.A >= 2) return POOL.a_high;
  if (delta.big5?.N && delta.big5.N >= 1) return POOL.n_high;
  const generics = [POOL.generic1, POOL.generic2, POOL.generic3, POOL.generic4];
  const idx = (parseInt(qid.replace(/[^0-9]/g, '') || '0', 10)) % generics.length;
  return generics[idx];
}

function fallbackMessage(questionId: string, choiceId: string): string {
  const q = SELECT_QUESTIONS.find((qq) => qq.id === questionId);
  const c = q?.choices.find((cc) => cc.id === choiceId);
  return pickFromDelta(c?.delta, questionId);
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ message: POOL.generic1, source: 'fallback' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }

  const questionId = body.questionId ?? '';
  const choiceId = body.choiceId ?? '';

  // forceLlm は INTERNAL_SECRET を持つサーバー内部からのみ有効
  // 外部クライアントから forceLlm=true を渡してもLLMを無制限に起動させない（コスト爆発防止）
  const internalSecret = process.env.CRON_SECRET ?? '';
  const isInternal = req.headers.get('x-internal-secret') === internalSecret && !!internalSecret;
  if (body.forceLlm && !isInternal) {
    // 外部からの forceLlm=true は無視してプール返却にフォールバック
    body.forceLlm = false;
  }
  if (body.forceLlm && hasAnthropicApiKey() && !body.forcePool) {
    const result = await generateEmpathy({
      questionId,
      choiceId,
      choiceText: body.choiceText,
      currentTopAxes: body.currentTopAxes,
    });
    if (!result.fallback && result.message) {
      return new Response(
        JSON.stringify({
          message: result.message,
          source: 'llm',
          estimatedCostUsd: result.estimatedCostUsd,
          durationMs: result.durationMs,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
  }

  // プール返却
  const message = fallbackMessage(questionId, choiceId);
  return new Response(
    JSON.stringify({ message, source: 'pool' }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/empathy',
      method: 'POST',
      body: {
        questionId: 'Q5..Q30',
        choiceId: 'A..H',
        choiceText: '(optional)',
        currentTopAxes: '(optional - for LLM mode)',
        forceLlm: '(optional - true でLLM動的生成)',
        forcePool: '(optional - true でプール固定返却)',
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}
