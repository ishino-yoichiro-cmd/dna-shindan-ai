// LLM統合エンジンのモックテスト（API_KEY不要）
//
// 役割：
//   - 各章プロンプトを実際に組み立てる
//   - tokens 概算を計算
//   - scripts/sample-prompts.json に保存（プロンプトレビュー用）
//   - 動作の正常性を確認（API呼び出しはしない）
//
// 実行：tsx scripts/test-llm-mocked.ts

import fs from 'node:fs';
import path from 'node:path';
import { CHAPTER_IDS, CHAPTER_PROMPTS } from '../src/lib/llm';
import {
  buildCelestialContext,
  buildUserMessageBlocks,
  estimateCost,
  estimateTokensFromText,
  getSystemPromptBlocks,
  extractIntegrationTags,
  stripIntegrationTagsComment,
} from '../src/lib/llm';
import type {
  ChapterContext,
  CelestialResult,
  ScoreResult,
  RelationshipTag,
} from './_test-fixtures';
import { buildDummyContext } from './_test-fixtures';

function main() {
  console.log('# LLM mocked test — start');
  const ctx = buildDummyContext();

  // 1. システムプロンプトの確認
  const systemBlocks = getSystemPromptBlocks();
  const systemTokens = estimateTokensFromText(systemBlocks[0].text);
  console.log(`\n## System prompt`);
  console.log(`  text length : ${systemBlocks[0].text.length}`);
  console.log(`  est. tokens : ${systemTokens}`);
  console.log(`  cache_control: ${systemBlocks[0].cache_control?.type ?? 'none'}`);

  // 2. 共通コンテキストの確認
  const ctxText = buildCelestialContext(ctx);
  const ctxTokens = estimateTokensFromText(ctxText);
  console.log(`\n## Celestial context`);
  console.log(`  text length : ${ctxText.length}`);
  console.log(`  est. tokens : ${ctxTokens}`);

  // 3. 各章プロンプトの構築
  const allPrompts: Record<string, unknown> = {
    meta: {
      generatedAt: new Date().toISOString(),
      systemPromptTokens: systemTokens,
      celestialContextTokens: ctxTokens,
    },
    chapters: {},
  };

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;

  console.log(`\n## Per-chapter prompts`);
  console.log('| Chapter | userPrompt tokens | totalInput tokens | maxOutput | est cost(no cache) | est cost(with cache) |');
  console.log('|---------|-------------------|-------------------|-----------|--------------------|----------------------|');

  for (let i = 0; i < CHAPTER_IDS.length; i++) {
    const chapterId = CHAPTER_IDS[i];
    const prompt = CHAPTER_PROMPTS[chapterId];
    const userText = prompt.buildUserPrompt(ctx);
    const userTokens = estimateTokensFromText(userText);

    const blocks = buildUserMessageBlocks(ctx, userText);
    const totalUserTokens = ctxTokens + userTokens;
    const totalInputForRequest = systemTokens + totalUserTokens;

    // 1章目はキャッシュ書き込み、2章目以降は読み出しと仮定
    const isFirstCall = i === 0;
    const cacheWrite = isFirstCall ? systemTokens + ctxTokens : 0;
    const cacheRead = isFirstCall ? 0 : systemTokens + ctxTokens;
    const uncachedInput = userTokens; // 章固有プロンプト分のみ
    const expectedOutput = Math.floor(prompt.maxOutputTokens * 0.6); // 平均60%消費と仮定

    const usage = {
      inputTokens: uncachedInput,
      outputTokens: expectedOutput,
      cacheCreationInputTokens: cacheWrite,
      cacheReadInputTokens: cacheRead,
    };
    const cost = estimateCost(usage);

    totalInputTokens += uncachedInput;
    totalOutputTokens += expectedOutput;
    totalCacheRead += cacheRead;
    totalCacheWrite += cacheWrite;

    console.log(
      `| ${chapterId.padEnd(8)}| ${String(userTokens).padStart(17)} | ${String(totalInputForRequest).padStart(17)} | ${String(prompt.maxOutputTokens).padStart(9)} | $${cost.withoutCache.toFixed(5)} | $${cost.withCache.toFixed(5)} |`,
    );

    (allPrompts.chapters as Record<string, unknown>)[chapterId] = {
      title: prompt.title,
      maxOutputTokens: prompt.maxOutputTokens,
      blocks: blocks.map((b) => ({
        type: b.type,
        text: b.text,
        cache_control: b.cache_control,
        tokensEst: estimateTokensFromText(b.text),
      })),
      systemBlocks: systemBlocks.map((b) => ({
        type: b.type,
        textPreview: b.text.slice(0, 200) + '...(略)',
        cache_control: b.cache_control,
        tokensEst: estimateTokensFromText(b.text),
      })),
      estimatedUsage: usage,
      estimatedCost: cost,
    };
  }

  // 累計
  const totalUsage = {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cacheCreationInputTokens: totalCacheWrite,
    cacheReadInputTokens: totalCacheRead,
  };
  const totalCost = estimateCost(totalUsage);
  console.log(`\n## Totals (1 diagnosis = 13 chapters)`);
  console.log(`  total input tokens (uncached) : ${totalInputTokens}`);
  console.log(`  total cache write tokens      : ${totalCacheWrite}`);
  console.log(`  total cache read tokens       : ${totalCacheRead}`);
  console.log(`  total output tokens           : ${totalOutputTokens}`);
  console.log(`  est. cost without cache       : $${totalCost.withoutCache.toFixed(4)}`);
  console.log(`  est. cost with cache          : $${totalCost.withCache.toFixed(4)}`);
  console.log(`  saved                         : $${totalCost.savedUsd.toFixed(4)}`);
  console.log(`  cache hit ratio (input only)  : ${(totalCost.cacheHitRatio * 100).toFixed(1)}%`);
  console.log(`  target $0.13 ?                : ${totalCost.withCache <= 0.13 ? 'OK' : 'OVER'}`);

  (allPrompts as { totals: unknown }).totals = {
    usage: totalUsage,
    cost: totalCost,
  };

  // 統合タグ抽出のテスト
  const dummyChapter1Text = `（本文）

<!-- INTEGRATION_TAGS
- 観察主義
- 論理思考
- 一人時間で充電
- 美意識重視
- 感情の言語化
- 構造分解癖
- 実装力
- 他者観察
- 矛盾耐性
- 中長期志向
-->`;
  const tags = extractIntegrationTags(dummyChapter1Text);
  const stripped = stripIntegrationTagsComment(dummyChapter1Text);
  console.log(`\n## Integration tags extraction`);
  console.log(`  tags found    : ${tags.length}`);
  console.log(`  tags          : ${tags.join(', ')}`);
  console.log(`  stripped len  : ${stripped.length} (orig=${dummyChapter1Text.length})`);

  // 出力
  const outPath = path.join(__dirname, 'sample-prompts.json');
  fs.writeFileSync(outPath, JSON.stringify(allPrompts, null, 2), 'utf-8');
  console.log(`\n## Output`);
  console.log(`  saved to: ${outPath}`);
  console.log('\n# LLM mocked test — done');
}

main();
