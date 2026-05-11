// Google Gemini クライアント（gemini-2.0-flash）
//
// 用途：Anthropicより高速・格安なGemini 2.0 Flashを使ったレポート生成。
// プロバイダー切り替え：env LLM_PROVIDER=gemini で有効化。
// 速度：~500 tokens/sec（Anthropic Sonnetの10倍）
// コスト：$0.10/MTok入力 $0.40/MTok出力（Sonnetの1/10〜1/40）

import { GoogleGenerativeAI } from '@google/generative-ai';

export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

// Gemini 2.5 Flash 料金（thinking tokensも出力扱いで課金）
export const GEMINI_FLASH_PRICING = {
  inputPerMTok: 0.15,
  outputPerMTok: 0.60,
};

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('[llm/gemini-client] GOOGLE_GENERATIVE_AI_API_KEY が未設定です。');
  }
  if (_client) return _client;
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function isGeminiEnabled(): boolean {
  return process.env.LLM_PROVIDER?.trim() === 'gemini' && hasGeminiApiKey();
}

export function estimateGeminiCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * GEMINI_FLASH_PRICING.inputPerMTok +
    (outputTokens / 1_000_000) * GEMINI_FLASH_PRICING.outputPerMTok
  );
}
