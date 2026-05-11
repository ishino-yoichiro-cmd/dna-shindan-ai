// LLMコスト計算ヘルパー
//
// Claude Sonnet 4.6 価格（2026-04時点）：
//   Input  : $3.00 / 1M tokens
//   Output : $15.00 / 1M tokens
//   Cache write (5min ephemeral) : $3.75 / 1M tokens（input × 1.25）
//   Cache read                   : $0.30 / 1M tokens（input × 0.10）
//
// 1診断の目標：$0.13以下
// 内訳目安：13章 × 平均 input 2000t（うちキャッシュヒット1500t）+ output 1000t = 約 $0.10〜$0.13

export const SONNET_4_6_PRICING = {
  inputPerMillion: 3.0,
  outputPerMillion: 15.0,
  cacheWritePerMillion: 3.75,
  cacheReadPerMillion: 0.3,
} as const;

export interface UsageBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface CostBreakdown {
  withCache: number; // キャッシュ適用時の総コスト（USD）
  withoutCache: number; // キャッシュ未適用想定の総コスト（USD）
  savedUsd: number; // 節約額
  cacheHitRatio: number; // 0..1 の入力tokenキャッシュヒット率
}

/**
 * 単発呼び出し1回分のコスト見積。
 * Anthropic API の usage レスポンスから生成。
 */
export function estimateCost(usage: UsageBreakdown): CostBreakdown {
  const {
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
  } = usage;

  // with cache：実コスト
  const inputCost =
    (inputTokens * SONNET_4_6_PRICING.inputPerMillion) / 1_000_000;
  const outputCost =
    (outputTokens * SONNET_4_6_PRICING.outputPerMillion) / 1_000_000;
  const cacheWriteCost =
    (cacheCreationInputTokens * SONNET_4_6_PRICING.cacheWritePerMillion) /
    1_000_000;
  const cacheReadCost =
    (cacheReadInputTokens * SONNET_4_6_PRICING.cacheReadPerMillion) /
    1_000_000;
  const withCache = inputCost + outputCost + cacheWriteCost + cacheReadCost;

  // without cache：すべてフル価格でinput扱い
  const totalInputAsUncached =
    inputTokens + cacheCreationInputTokens + cacheReadInputTokens;
  const withoutCache =
    (totalInputAsUncached * SONNET_4_6_PRICING.inputPerMillion) / 1_000_000 +
    outputCost;

  const totalInput =
    inputTokens + cacheCreationInputTokens + cacheReadInputTokens;
  const cacheHitRatio = totalInput === 0 ? 0 : cacheReadInputTokens / totalInput;

  return {
    withCache,
    withoutCache,
    savedUsd: Math.max(0, withoutCache - withCache),
    cacheHitRatio,
  };
}

/**
 * 1診断あたり累計コスト（13章分の合算）。
 */
export function estimateDiagnosisCost(
  perChapterUsage: UsageBreakdown[],
): CostBreakdown {
  const total: UsageBreakdown = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };
  for (const u of perChapterUsage) {
    total.inputTokens += u.inputTokens;
    total.outputTokens += u.outputTokens;
    total.cacheCreationInputTokens += u.cacheCreationInputTokens;
    total.cacheReadInputTokens += u.cacheReadInputTokens;
  }
  return estimateCost(total);
}

/**
 * tokens 概算（入力テキスト用・日本語前提）。
 * 日本語1文字 ≒ 1〜2 tokens。安全側で 1.5 として概算。
 * 正確な値は API の count_tokens を使う。
 */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  // 英数字混在を考慮：日本語は約0.6〜1文字/token、英数字は約4文字/token。
  // 簡易的に「全長 × 0.7」を tokens 数とみなす（やや多めに見積もる）。
  return Math.ceil(text.length * 0.7);
}
