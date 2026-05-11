// 実LLM呼び出しテスト（ANTHROPIC_API_KEY 必須）
//
// 役割：
//   - 1章だけ実際にClaude Sonnet 4.6で生成
//   - 出力を scripts/sample-chapter1.md に保存
//   - キャッシュ動作の確認も兼ねて2回実行（1回目=書き込み・2回目=読み出し）
//
// API_KEYなしの場合：警告表示してスキップ（エラーにしない）。
//
// 実行：tsx scripts/test-llm-real.ts

import fs from 'node:fs';
import path from 'node:path';
import { generateChapter, hasAnthropicApiKey, MODEL_DEFAULT } from '../src/lib/llm';
import { buildDummyContext } from './_test-fixtures';

async function main() {
  if (!hasAnthropicApiKey()) {
    console.warn(
      '[test-llm-real] ANTHROPIC_API_KEY が未設定のため、実呼び出しをスキップします。\n' +
        '              モックテストは scripts/test-llm-mocked.ts を使ってください。',
    );
    process.exit(0);
  }

  const ctx = buildDummyContext();

  console.log(`# Real LLM test`);
  console.log(`  model: ${MODEL_DEFAULT}`);

  // 1回目（キャッシュ書き込み）
  console.log(`\n## Run 1 (cache write)`);
  const t0 = Date.now();
  const result1 = await generateChapter('cover', ctx);
  const t1 = Date.now() - t0;
  console.log(`  success      : ${result1.success}`);
  console.log(`  duration     : ${t1}ms`);
  console.log(`  text length  : ${result1.text.length}`);
  console.log(`  input tokens : ${result1.usage.inputTokens}`);
  console.log(`  output tokens: ${result1.usage.outputTokens}`);
  console.log(`  cache write  : ${result1.usage.cacheCreationInputTokens}`);
  console.log(`  cache read   : ${result1.usage.cacheReadInputTokens}`);
  console.log(`  cost (USD)   : $${result1.estimatedCostUsd.toFixed(5)}`);
  if (!result1.success) {
    console.error(`  ERROR: ${result1.error}`);
  }

  // 2回目（キャッシュ読み出し期待）
  console.log(`\n## Run 2 (cache read expected)`);
  const t2 = Date.now();
  const result2 = await generateChapter('chapter1', ctx);
  const t3 = Date.now() - t2;
  console.log(`  success      : ${result2.success}`);
  console.log(`  duration     : ${t3}ms`);
  console.log(`  text length  : ${result2.text.length}`);
  console.log(`  input tokens : ${result2.usage.inputTokens}`);
  console.log(`  output tokens: ${result2.usage.outputTokens}`);
  console.log(`  cache write  : ${result2.usage.cacheCreationInputTokens}`);
  console.log(`  cache read   : ${result2.usage.cacheReadInputTokens}`);
  console.log(`  cost (USD)   : $${result2.estimatedCostUsd.toFixed(5)}`);
  if (!result2.success) {
    console.error(`  ERROR: ${result2.error}`);
  }

  // 1章テキストを保存
  const out1 = path.join(__dirname, 'sample-chapter1.md');
  fs.writeFileSync(
    out1,
    `# ${result2.success ? 'Chapter 1 (real LLM)' : 'Chapter 1 (failed)'}\n\n${result2.text}\n`,
    'utf-8',
  );
  console.log(`\n  saved chapter1 to: ${out1}`);

  // 序章も保存
  const out0 = path.join(__dirname, 'sample-cover.md');
  fs.writeFileSync(
    out0,
    `# ${result1.success ? 'Cover (real LLM)' : 'Cover (failed)'}\n\n${result1.text}\n`,
    'utf-8',
  );
  console.log(`  saved cover    to: ${out0}`);

  // キャッシュヒット確認
  if (result2.usage.cacheReadInputTokens > 0) {
    console.log(
      `\n[OK] cache hit confirmed: ${result2.usage.cacheReadInputTokens} tokens read from cache`,
    );
  } else {
    console.warn(
      `\n[WARN] cache hit NOT confirmed. このまま全章を回すとコストが想定の2倍になる可能性があります。`,
    );
  }
}

main().catch((e) => {
  console.error('[test-llm-real] failed:', e);
  process.exit(1);
});
