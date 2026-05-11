/**
 * 分身AIチャットエンジン
 *
 * - Sonnet 4.6 + プロンプトキャッシュ（systemに cache_control: ephemeral）
 * - ストリーミング対応（Server-Sent Events を呼び出し側で組み立てる）
 * - chat_count をインクリメント・last_chatted_at 更新
 *
 * 1チャット応答コスト想定：
 *   - system_prompt: 約 1,200 tokens（cache hit時 0.1×）
 *   - history: 平均 6往復 × 200 tokens ≒ 1,200 tokens
 *   - 出力: 約 300 tokens
 *   ≒ $0.001 - $0.005（cache hit時）
 *
 * 制約：
 *   - Anthropic SDK は Node 依存のため、route handler の runtime は 'nodejs'
 *   - ANTHROPIC_API_KEY 必須。未設定環境ではエラーを投げる（呼び出し側でハンドリング）
 */

import type Anthropic from '@anthropic-ai/sdk';
import {
  getAnthropicClient,
  hasAnthropicApiKey,
  MODEL_DEFAULT,
} from '@/lib/llm/client';
import { estimateCost } from '@/lib/llm/cost';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { ClonesRow } from '@/lib/supabase/database.types';

// ============================================================================
// 型
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  maxOutputTokens?: number;
  client?: Anthropic;
  /** ストリーミング1チャンクごとに呼ばれるコールバック（テキストデルタを渡す） */
  onTextDelta?: (delta: string) => void;
}

export interface ChatResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
  estimatedCostUsd: number;
  durationMs: number;
  model: string;
}

// ============================================================================
// クローン取得（Supabaseから system_prompt を読み出し）
// ============================================================================

export async function loadCloneById(cloneId: string): Promise<ClonesRow | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('clones')
    .select('*')
    .eq('id', cloneId)
    .maybeSingle();
  if (error) {
    throw new Error(`[clone/chat-engine] clones取得失敗: ${error.message}`);
  }
  return data ?? null;
}

/**
 * diagnosis_id で逆引きして clones を取得（公開URLが /clone/[diagnosis_id] のため）
 */
export async function loadCloneByDiagnosisId(
  diagnosisId: string,
): Promise<ClonesRow | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('clones')
    .select('*')
    .eq('diagnosis_id', diagnosisId)
    .maybeSingle();
  if (error) {
    throw new Error(`[clone/chat-engine] clones取得失敗: ${error.message}`);
  }
  return data ?? null;
}

// ============================================================================
// メイン：チャット応答
// ============================================================================

/**
 * 指定 cloneId（または diagnosisId）の分身AIに対して 1ターン応答を返す。
 *
 * @param identifier 分身ID（clones.id または clones.diagnosis_id）
 * @param userMessage ユーザー最新発話
 * @param history 過去ターン（user/assistant 交互）
 * @param options ストリーミングコールバック等
 */
export async function chat(
  identifier: string,
  userMessage: string,
  history: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  if (!hasAnthropicApiKey()) {
    throw new Error(
      '[clone/chat-engine] ANTHROPIC_API_KEY が未設定です。チャットを起動できません。',
    );
  }

  // identifier が UUID なら id 検索 → 見つからなければ diagnosis_id 検索
  let clone = await loadCloneById(identifier);
  if (!clone) {
    clone = await loadCloneByDiagnosisId(identifier);
  }
  if (!clone) {
    throw new Error(`[clone/chat-engine] 分身AIが見つかりません: ${identifier}`);
  }
  if (!clone.system_prompt || clone.system_prompt.length < 100) {
    throw new Error('[clone/chat-engine] system_prompt が空または不正です');
  }

  return await chatWithSystemPrompt(
    clone.system_prompt,
    userMessage,
    history,
    {
      ...options,
      _onComplete: async () => {
        // chat_count++ / last_chatted_at 更新（失敗しても応答は通す）
        await incrementChatCount(clone!.id).catch((e) => {
          console.warn('[clone/chat-engine] chat_count update failed:', e);
        });
      },
    },
  );
}

interface InternalChatOptions extends ChatOptions {
  _onComplete?: () => Promise<void>;
}

/**
 * Supabase 経由ではなく、生の system_prompt で直接チャット（テスト・スクリプト用）。
 */
export async function chatWithSystemPrompt(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessage[],
  options: InternalChatOptions = {},
): Promise<ChatResult> {
  const start = Date.now();
  const model = options.model ?? MODEL_DEFAULT;
  const maxTokens = options.maxOutputTokens ?? 800;
  const client = options.client ?? getAnthropicClient();

  // メッセージ履歴の構築（最新の userMessage を末尾に追加）
  const messages = buildMessages(history, userMessage);

  // system は単一ブロック + cache_control: ephemeral
  const systemBlocks = [
    {
      type: 'text' as const,
      text: systemPrompt,
      cache_control: { type: 'ephemeral' as const },
    },
  ];

  // ストリーミング有無で分岐
  if (options.onTextDelta) {
    return await runStreaming(
      client,
      model,
      maxTokens,
      systemBlocks,
      messages,
      options.onTextDelta,
      start,
      options._onComplete,
    );
  }

  // 非ストリーミング
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemBlocks as unknown as Anthropic.TextBlockParam[],
    messages,
  });

  const text = extractTextFromResponse(response);
  const usage = extractUsage(response);
  const cost = estimateCost(usage);

  if (options._onComplete) {
    await options._onComplete();
  }

  return {
    text,
    usage,
    estimatedCostUsd: cost.withCache,
    durationMs: Date.now() - start,
    model,
  };
}

// ============================================================================
// ストリーミング処理
// ============================================================================

async function runStreaming(
  client: Anthropic,
  model: string,
  maxTokens: number,
  systemBlocks: { type: 'text'; text: string; cache_control: { type: 'ephemeral' } }[],
  messages: { role: 'user' | 'assistant'; content: string }[],
  onTextDelta: (delta: string) => void,
  startMs: number,
  onComplete?: () => Promise<void>,
): Promise<ChatResult> {
  const stream = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemBlocks as unknown as Anthropic.TextBlockParam[],
    messages,
    stream: true,
  });

  const collected: string[] = [];
  let usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };

  for await (const event of stream) {
    // SDK 0.30 の MessageStreamEvent
    if (event.type === 'content_block_delta') {
      const delta = (event as unknown as {
        delta?: { type?: string; text?: string };
      }).delta;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        collected.push(delta.text);
        onTextDelta(delta.text);
      }
    } else if (event.type === 'message_start') {
      const msg = (event as unknown as {
        message?: {
          usage?: {
            input_tokens?: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
          };
        };
      }).message;
      if (msg?.usage) {
        usage.inputTokens = msg.usage.input_tokens ?? 0;
        usage.cacheCreationInputTokens = msg.usage.cache_creation_input_tokens ?? 0;
        usage.cacheReadInputTokens = msg.usage.cache_read_input_tokens ?? 0;
      }
    } else if (event.type === 'message_delta') {
      const u = (event as unknown as {
        usage?: { output_tokens?: number };
      }).usage;
      if (u?.output_tokens !== undefined) {
        usage.outputTokens = u.output_tokens;
      }
    }
  }

  const text = collected.join('').trim();
  const cost = estimateCost(usage);

  if (onComplete) {
    await onComplete();
  }

  return {
    text,
    usage,
    estimatedCostUsd: cost.withCache,
    durationMs: Date.now() - startMs,
    model,
  };
}

// ============================================================================
// ヘルパ
// ============================================================================

function buildMessages(
  history: ChatMessage[],
  userMessage: string,
): { role: 'user' | 'assistant'; content: string }[] {
  // user/assistant 交互であることを保証
  const cleaned: ChatMessage[] = [];
  for (const m of history) {
    if (!m.content || !m.content.trim()) continue;
    if (cleaned.length === 0 && m.role !== 'user') continue;
    if (
      cleaned.length > 0 &&
      cleaned[cleaned.length - 1].role === m.role
    ) {
      // 同じrole連続は最後を上書き
      cleaned[cleaned.length - 1] = m;
      continue;
    }
    cleaned.push(m);
  }

  // 末尾に最新の userMessage を追加。既に末尾が user の場合は連結。
  if (
    cleaned.length > 0 &&
    cleaned[cleaned.length - 1].role === 'user'
  ) {
    cleaned[cleaned.length - 1] = {
      role: 'user',
      content: userMessage.trim(),
    };
  } else {
    cleaned.push({ role: 'user', content: userMessage.trim() });
  }

  return cleaned.map((m) => ({ role: m.role, content: m.content }));
}

function extractTextFromResponse(response: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text') parts.push(block.text);
  }
  return parts.join('').trim();
}

function extractUsage(response: Anthropic.Message): {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
} {
  return {
    inputTokens: response.usage.input_tokens ?? 0,
    outputTokens: response.usage.output_tokens ?? 0,
    cacheCreationInputTokens:
      (response.usage as unknown as { cache_creation_input_tokens?: number })
        .cache_creation_input_tokens ?? 0,
    cacheReadInputTokens:
      (response.usage as unknown as { cache_read_input_tokens?: number })
        .cache_read_input_tokens ?? 0,
  };
}

async function incrementChatCount(cloneId: string): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  // 楽観更新：select → update（1往復で済ませるため最小限）
  const { data, error: selErr } = await supabase
    .from('clones')
    .select('chat_count')
    .eq('id', cloneId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  const next = (data?.chat_count ?? 0) + 1;
  const { error: updErr } = await supabase
    .from('clones')
    .update({
      chat_count: next,
      last_chatted_at: new Date().toISOString(),
    })
    .eq('id', cloneId);
  if (updErr) throw new Error(updErr.message);
}
