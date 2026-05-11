// LLMジェネレータ — 章テキスト・共感メッセージ生成
//
// プロンプトキャッシュ前提：
//   - system プロンプト：13章で同一（cache_control: ephemeral）
//   - 共通コンテキスト：1診断内で同一（cache_control: ephemeral）
//
// 並列度：同時5並列まで（指示書）。
// エラーハンドリング：個別章失敗OK。フォールバックテキストを返す。

import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, MODEL_DEFAULT, MODEL_HAIKU } from './client';
export { MODEL_HAIKU };
import { getGeminiClient, isGeminiEnabled, estimateGeminiCost, GEMINI_FLASH_MODEL } from './gemini-client';
import { estimateCost } from './cost';
import { buildUserMessageBlocks } from './cache';
import { buildCelestialContext } from './prompts/celestial-context';
import { SYSTEM_PROMPT, GEMINI_SYSTEM_PROMPT, getSystemPromptBlocks } from './prompts/system';
import { runQualityGate, buildRetryInstruction } from './post-process';
import { CHAPTER_PROMPTS } from './prompts/chapters';
import { getEmpathySystemPromptBlocks } from './prompts/empathy';
import type {
  ChapterContext,
  ChapterId,
  EmpathyInput,
  EmpathyResult,
  GenerationSummary,
  LLMResult,
} from './types';
import { CHAPTER_IDS } from './types';

// SDK の content block 型は内部で Union を使うので、
// 受け入れ側の型を明示しておく（cache_control を含む TextBlockParam 互換）。
export type ContentBlockSource = {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
};

// ============================================================================
// 単一章生成
// ============================================================================

export interface GenerateChapterOptions {
  model?: string;
  temperature?: number;
  client?: Anthropic; // テスト差し替え用
}

export async function generateChapter(
  chapterId: ChapterId,
  ctx: ChapterContext,
  options: GenerateChapterOptions = {},
): Promise<LLMResult> {
  // Gemini が有効な場合は Gemini ルートへ
  if (isGeminiEnabled()) {
    return generateChapterGemini(chapterId, ctx, options);
  }
  return generateChapterAnthropic(chapterId, ctx, options);
}

async function generateChapterAnthropic(
  chapterId: ChapterId,
  ctx: ChapterContext,
  options: GenerateChapterOptions = {},
): Promise<LLMResult> {
  const start = Date.now();
  const prompt = CHAPTER_PROMPTS[chapterId];
  if (!prompt) {
    return {
      chapterId,
      text: '',
      usage: emptyUsage(),
      estimatedCostUsd: 0,
      durationMs: 0,
      model: options.model ?? MODEL_DEFAULT,
      success: false,
      error: `Unknown chapterId: ${chapterId}`,
    };
  }

  const userText = prompt.buildUserPrompt(ctx);
  const userBlocks = buildUserMessageBlocks(ctx, userText);
  const systemBlocks = getSystemPromptBlocks();
  const model = options.model ?? MODEL_DEFAULT;

  try {
    const client = options.client ?? getAnthropicClient();
    const response = await client.messages.create({
      model,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      max_tokens: prompt.maxOutputTokens,
      system: systemBlocks as unknown as Anthropic.TextBlockParam[],
      messages: [
        {
          role: 'user',
          content: userBlocks as unknown as Anthropic.TextBlockParam[],
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const usage = {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens:
        (response.usage as unknown as { cache_creation_input_tokens?: number })
          .cache_creation_input_tokens ?? 0,
      cacheReadInputTokens:
        (response.usage as unknown as { cache_read_input_tokens?: number })
          .cache_read_input_tokens ?? 0,
    };
    const cost = estimateCost(usage);

    return {
      chapterId,
      text,
      usage,
      estimatedCostUsd: cost.withCache,
      durationMs: Date.now() - start,
      model,
      success: true,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      chapterId,
      text: fallbackText(chapterId),
      usage: emptyUsage(),
      estimatedCostUsd: 0,
      durationMs: Date.now() - start,
      model,
      success: false,
      error: message,
    };
  }
}

async function generateChapterGemini(
  chapterId: ChapterId,
  ctx: ChapterContext,
  options: GenerateChapterOptions = {},
): Promise<LLMResult> {
  const start = Date.now();
  const prompt = CHAPTER_PROMPTS[chapterId];
  const model = options.model ?? GEMINI_FLASH_MODEL;

  if (!prompt) {
    return {
      chapterId,
      text: '',
      usage: emptyUsage(),
      estimatedCostUsd: 0,
      durationMs: 0,
      model,
      success: false,
      error: `Unknown chapterId: ${chapterId}`,
    };
  }

  // Gemini はシステム指示を systemInstruction で受け取る。
  // ユーザーメッセージは「共通コンテキスト + 章固有指示」を連結したテキスト。
  const userText = `${buildCelestialContext(ctx)}\n\n---\n\n${prompt.buildUserPrompt(ctx)}`;

  // Gemini のトークナイザーは日本語CJKで Anthropic より多くのトークンを消費する。
  // Anthropic: ~1.5 tokens/char → 5500 tokens ≈ 3600字
  // Gemini 2.5 Flash: ~2 tokens/char → 5500 tokens ≈ 2750字（要件4000字に全然届かない）
  // そのため Gemini 用には 16000 トークン（≈ 8000字）を上限として設定する。
  const geminiMaxTokens = Math.max(prompt.maxOutputTokens * 3, 16000);

  // ── Gemini API 呼び出しヘルパー（リトライ共通化） ──
  // extraInstruction を渡すと userText 末尾に追記して再生成する。
  type GeminiRawResult = {
    text: string;
    inputTokens: number;
    outputTokens: number;
  };

  async function callGemini(extraInstruction?: string): Promise<GeminiRawResult> {
    const client = getGeminiClient();
    const geminiModel = client.getGenerativeModel({
      model,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
    });
    const fullText = extraInstruction ? `${userText}\n\n${extraInstruction}` : userText;
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullText }] }],
      generationConfig: {
        maxOutputTokens: geminiMaxTokens,
        temperature: options.temperature ?? 1.0,
      },
    });
    const raw = result.response.text().trim();
    const usageMeta = result.response.usageMetadata;
    const inputTokens = usageMeta?.promptTokenCount ?? 0;
    // 2.5 Flash は thinking tokens も candidatesTokenCount とは別に課金される
    const candidateTokens = usageMeta?.candidatesTokenCount ?? 0;
    const thoughtTokens = (usageMeta as { thoughtsTokenCount?: number })?.thoughtsTokenCount ?? 0;
    const outputTokens = candidateTokens + thoughtTokens;
    return { text: raw, inputTokens, outputTokens };
  }

  try {
    // ── 1回目生成 ──
    const first = await callGemini();
    const qc1 = runQualityGate(first.text, chapterId);

    // ── QCゲート：致命的問題があればリトライ ──
    let finalText = qc1.sanitizedText;
    let totalInput = first.inputTokens;
    let totalOutput = first.outputTokens;
    let qcIssues = qc1.issues;

    if (qc1.hasFatalIssue) {
      const retry = await callGemini(buildRetryInstruction(qc1.issues));
      const qc2 = runQualityGate(retry.text, chapterId);
      totalInput += retry.inputTokens;
      totalOutput += retry.outputTokens;

      if (qc2.hasFatalIssue) {
        // 2回試みても致命的問題が残る場合は失敗扱い
        return {
          chapterId,
          text: fallbackText(chapterId),
          usage: { inputTokens: totalInput, outputTokens: totalOutput, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
          estimatedCostUsd: estimateGeminiCost(totalInput, totalOutput),
          durationMs: Date.now() - start,
          model,
          success: false,
          error: `QCゲート2回失敗: ${qc2.issues.join(' / ')}`,
        };
      }

      finalText = qc2.sanitizedText;
      qcIssues = [...qc1.issues, ...qc2.issues];
    }

    const usage = { inputTokens: totalInput, outputTokens: totalOutput, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
    const estimatedCostUsd = estimateGeminiCost(totalInput, totalOutput);

    return {
      chapterId,
      text: finalText,
      usage,
      estimatedCostUsd,
      durationMs: Date.now() - start,
      model,
      success: true,
      // 自動修正した軽微問題はエラーではなく警告として記録（ログ・デバッグ用）
      ...(qcIssues.length > 0 ? { error: `[QC自動修正] ${qcIssues.join(' / ')}` } : {}),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Gemini 429（クォータ超過）の場合は quota_exceeded として記録
    // retry-failedが再試行するまでDBでfailed扱いにする
    const isQuotaError = message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate');
    return {
      chapterId,
      text: fallbackText(chapterId),
      usage: emptyUsage(),
      estimatedCostUsd: 0,
      durationMs: Date.now() - start,
      model,
      success: false,
      error: isQuotaError ? `quota_exceeded:${message}` : message,
    };
  }
}

function extractTextFromResponse(response: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text') {
      parts.push(block.text);
    }
  }
  return parts.join('').trim();
}

function emptyUsage() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };
}

function fallbackText(chapterId: ChapterId): string {
  return `（この章は生成に失敗したため、後ほど再生成してください。chapterId=${chapterId}）`;
}

// ============================================================================
// 全章並列生成
// ============================================================================

export interface GenerateAllOptions extends GenerateChapterOptions {
  concurrency?: number; // デフォルト5
  onProgress?: (chapterId: ChapterId, result: LLMResult) => void;
}

export async function generateAllChapters(
  ctx: ChapterContext,
  options: GenerateAllOptions = {},
): Promise<GenerationSummary> {
  const start = Date.now();
  const concurrency = options.concurrency ?? 5;
  const results: Partial<Record<ChapterId, LLMResult>> = {};

  // 重要：プロンプトキャッシュは「1章目で書き込み→2章目以降で読み出し」の
  //       タイミングに依存する。並列で全章を一気に投げるとキャッシュヒット率が下がる
  //       （同時に複数のリクエストが書き込みを試みる）。
  //       そのため：1章目だけ単発で実行 → キャッシュ書き込みが完了 → 残り12章を並列実行、
  //       という2段階で投げる。これで1章目以降の cacheRead が確実にヒットする。

  // 1章目（cover）を単発実行
  const firstId: ChapterId = 'cover';
  const firstResult = await generateChapter(firstId, ctx, options);
  results[firstId] = firstResult;
  options.onProgress?.(firstId, firstResult);

  // 残り12章をプール並列で実行
  const remaining = CHAPTER_IDS.filter((id) => id !== firstId);
  await runWithConcurrency(remaining, concurrency, async (id) => {
    const r = await generateChapter(id, ctx, options);
    results[id] = r;
    options.onProgress?.(id, r);
  });

  // 集計
  const summary = aggregateSummary(results, start);
  return summary;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, concurrency); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item === undefined) return;
          await fn(item);
        }
      })(),
    );
  }
  await Promise.all(workers);
}

function aggregateSummary(
  results: Partial<Record<ChapterId, LLMResult>>,
  startMs: number,
): GenerationSummary {
  const final: Record<ChapterId, LLMResult> = {} as Record<ChapterId, LLMResult>;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationInputTokens = 0;
  let cacheReadInputTokens = 0;
  let totalCost = 0;
  let successCount = 0;
  let failureCount = 0;
  for (const id of CHAPTER_IDS) {
    const r = results[id];
    if (r) {
      final[id] = r;
      inputTokens += r.usage.inputTokens;
      outputTokens += r.usage.outputTokens;
      cacheCreationInputTokens += r.usage.cacheCreationInputTokens;
      cacheReadInputTokens += r.usage.cacheReadInputTokens;
      totalCost += r.estimatedCostUsd;
      if (r.success) successCount++;
      else failureCount++;
    } else {
      final[id] = {
        chapterId: id,
        text: fallbackText(id),
        usage: emptyUsage(),
        estimatedCostUsd: 0,
        durationMs: 0,
        model: MODEL_DEFAULT,
        success: false,
        error: 'not generated',
      };
      failureCount++;
    }
  }
  return {
    chapters: final,
    totalUsage: {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    },
    totalCostUsd: totalCost,
    durationMs: Date.now() - startMs,
    successCount,
    failureCount,
  };
}

// ============================================================================
// 統合タグ抽出（1章末尾のHTMLコメント）
// ============================================================================

export function extractIntegrationTags(chapter1Text: string): string[] {
  const m = chapter1Text.match(/<!--\s*INTEGRATION_TAGS([\s\S]*?)-->/);
  if (!m) return [];
  const inner = m[1];
  const tags: string[] = [];
  for (const line of inner.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-')) {
      const tag = trimmed.replace(/^-+\s*/, '').trim();
      if (tag) tags.push(tag);
    }
  }
  return tags;
}

/**
 * 章テキストから統合タグの HTMLコメントを除去（最終納品向け）。
 */
export function stripIntegrationTagsComment(text: string): string {
  return text.replace(/<!--\s*INTEGRATION_TAGS[\s\S]*?-->\s*/g, '').trimEnd();
}

// ============================================================================
// バッチ生成（複数章を1APIコールで生成）
// ============================================================================

export interface BatchGenerateResult {
  chapters: Partial<Record<ChapterId, string>>;
  estimatedCostUsd: number;
  missingChapterIds: ChapterId[];
  success: boolean;
  error?: string;
}

/**
 * 指定した複数章を1回のAPIコールで生成する。
 * 各章は <chapter id="...">...</chapter> タグで出力させ、パースする。
 * model を指定しない場合は MODEL_DEFAULT（Sonnet）を使用。
 */
export async function generateBatch(
  chapterIds: ChapterId[],
  ctx: ChapterContext,
  options: { model?: string; client?: Anthropic } = {},
): Promise<BatchGenerateResult> {
  if (chapterIds.length === 0) {
    return { chapters: {}, estimatedCostUsd: 0, missingChapterIds: [], success: true };
  }

  const model = options.model ?? MODEL_DEFAULT;
  const apiClient = options.client ?? getAnthropicClient();
  const systemBlocks = getSystemPromptBlocks();

  // 各章の指示を結合
  const chapterInstructions = chapterIds.map((id) => {
    const prompt = CHAPTER_PROMPTS[id];
    if (!prompt) return `【章: ${id}】\nこの章の定義が見つかりません。`;
    return `【章ID: ${id}】\n${prompt.buildUserPrompt(ctx)}`;
  });

  const combinedMaxTokens = Math.min(
    chapterIds.reduce((sum, id) => sum + (CHAPTER_PROMPTS[id]?.maxOutputTokens ?? 5500), 0),
    65536,
  );

  const batchInstruction = `以下の${chapterIds.length}章を順番に生成してください。
各章の出力を必ず以下のXMLタグで囲んでください（タグの外にテキストを書かないこと）：
<chapter id="章ID">本文</chapter>

出力例：
<chapter id="cover">ここに序章の本文...</chapter>
<chapter id="end">ここに終章の本文...</chapter>

---

${chapterInstructions.join('\n\n---\n\n')}`;

  const userBlocks = buildUserMessageBlocks(ctx, batchInstruction);

  try {
    const response = await apiClient.messages.create({
      model,
      max_tokens: combinedMaxTokens,
      system: systemBlocks as unknown as Anthropic.TextBlockParam[],
      messages: [{ role: 'user', content: userBlocks as unknown as Anthropic.TextBlockParam[] }],
    });

    const rawText = extractTextFromResponse(response);
    const chapters: Partial<Record<ChapterId, string>> = {};
    const missingChapterIds: ChapterId[] = [];

    for (const id of chapterIds) {
      // <chapter id="id">...</chapter> を抽出（改行・空白を許容）
      const re = new RegExp(`<chapter\\s+id=["']${id}["']>([\\s\\S]*?)<\\/chapter>`, 'i');
      const match = rawText.match(re);
      if (match) {
        chapters[id] = match[1].trim();
      } else {
        missingChapterIds.push(id);
      }
    }

    const usage = {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens:
        (response.usage as unknown as { cache_creation_input_tokens?: number })
          .cache_creation_input_tokens ?? 0,
      cacheReadInputTokens:
        (response.usage as unknown as { cache_read_input_tokens?: number })
          .cache_read_input_tokens ?? 0,
    };
    const cost = estimateCost(usage);

    return {
      chapters,
      estimatedCostUsd: cost.withCache,
      missingChapterIds,
      success: missingChapterIds.length === 0,
      error: missingChapterIds.length > 0 ? `マーカー未検出: ${missingChapterIds.join(', ')}` : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { chapters: {}, estimatedCostUsd: 0, missingChapterIds: chapterIds, success: false, error: msg };
  }
}

// ============================================================================
// 共感メッセージ生成
// ============================================================================

export interface GenerateEmpathyOptions {
  model?: string;
  client?: Anthropic;
  // テンプレートマッチが優先。ここではテンプレート不在時のフォールバック動的生成のみ実装。
}

export async function generateEmpathy(
  input: EmpathyInput,
  options: GenerateEmpathyOptions = {},
): Promise<EmpathyResult> {
  const start = Date.now();
  const model = options.model ?? MODEL_DEFAULT;

  const userPrompt = buildEmpathyUserPrompt(input);
  const systemBlocks = getEmpathySystemPromptBlocks();

  try {
    const client = options.client ?? getAnthropicClient();
    const response = await client.messages.create({
      model,
      max_tokens: 200,
      system: systemBlocks as unknown as Anthropic.TextBlockParam[],
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });
    const text = extractTextFromResponse(response).replace(/\s+/g, ' ').trim();
    const usage = {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens:
        (response.usage as unknown as { cache_creation_input_tokens?: number })
          .cache_creation_input_tokens ?? 0,
      cacheReadInputTokens:
        (response.usage as unknown as { cache_read_input_tokens?: number })
          .cache_read_input_tokens ?? 0,
    };
    const cost = estimateCost(usage);
    return {
      message: text,
      usage,
      estimatedCostUsd: cost.withCache,
      durationMs: Date.now() - start,
      fallback: false,
    };
  } catch {
    // フォールバック：固定の汎用メッセージ
    return {
      message: 'その答え、あなたの選び方の癖がうっすら見える。次の問いで、もう少し輪郭が出てくる。',
      usage: emptyUsage(),
      estimatedCostUsd: 0,
      durationMs: Date.now() - start,
      fallback: true,
    };
  }
}

function buildEmpathyUserPrompt(input: EmpathyInput): string {
  const lines: string[] = [];
  lines.push(`# 入力`);
  lines.push(`質問ID：${input.questionId}`);
  lines.push(`選択ID：${input.choiceId}`);
  if (input.choiceText) {
    lines.push(`選択肢本文：${input.choiceText}`);
  }
  if (input.currentTopAxes) {
    if (input.currentTopAxes.big5Top && input.currentTopAxes.big5Top.length > 0) {
      lines.push(
        `Big5 TOP：${input.currentTopAxes.big5Top.map((a) => `${a.axis}=${a.score}`).join(', ')}`,
      );
    }
    if (input.currentTopAxes.enneaTop) {
      lines.push(
        `エニアTOP：${input.currentTopAxes.enneaTop.axis}（${input.currentTopAxes.enneaTop.score}）`,
      );
    }
    if (input.currentTopAxes.riasecTop) {
      lines.push(
        `RIASECトップ：${input.currentTopAxes.riasecTop.axis}（${input.currentTopAxes.riasecTop.score}）`,
      );
    }
  }
  lines.push('');
  lines.push(
    'この入力に対する共感メッセージを1行（60〜80字）で生成してください。',
  );
  lines.push('Markdownや引用符・前置きを含めず、本文のみ出力してください。');
  return lines.join('\n');
}
