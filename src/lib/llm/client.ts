// Anthropic SDK クライアント（Sonnet 4.6）
//
// 役割：
//  - SDK の唯一のシングルトン化
//  - タイムアウト・リトライ設定
//  - APIキー未設定時の振る舞い（呼び出し前にエラーで弾く）
//
// 注意：SDKのバージョンは package.json で 0.30.x。@anthropic-ai/sdk のクライアントは
//       cache_control をネイティブサポート。

import Anthropic from '@anthropic-ai/sdk';

// モデルID
export const MODEL_SONNET_4_6 = 'claude-sonnet-4-5'; // SDK 0.30 系で安定する identifier
export const MODEL_HAIKU = 'claude-haiku-4-5-20251001'; // 軽量章（cover/end）向け高速モデル
export const MODEL_DEFAULT = MODEL_SONNET_4_6;

// タイムアウト：250秒（Vercel function maxDuration=300秒の内側）
// max_tokens 5500-6000 で1章生成に60-150秒かかるため、十分なマージン確保
export const DEFAULT_TIMEOUT_MS = 250_000;
// リトライ：1回（タイムアウト時に長時間ブロック防止）
export const DEFAULT_MAX_RETRIES = 1;

// シングルトン
let _client: Anthropic | null = null;

/**
 * Anthropic クライアントを取得（環境変数 ANTHROPIC_API_KEY を使用）。
 * APIキーがない場合は呼び出し時にエラー。SDKをimportするだけで落ちないようにする。
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[llm/client] ANTHROPIC_API_KEY が未設定です。.env.local に設定するかモック実行を使用してください。',
    );
  }
  if (_client) return _client;
  _client = new Anthropic({
    apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  });
  return _client;
}

/**
 * APIキーが設定されているかだけを確認（クライアント生成しない）。
 * モック切り替え判定で使う。
 */
export function hasAnthropicApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * テスト・スクリプト用：クライアントを差し替え可能にする。
 */
export function _setClientForTest(client: Anthropic | null): void {
  _client = client;
}
