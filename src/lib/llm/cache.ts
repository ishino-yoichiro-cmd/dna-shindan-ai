// プロンプトキャッシュ補助
//
// 役割：
//  - システムプロンプト（全章共通）を ephemeral でキャッシュ
//  - 命術コンテキスト（同一ユーザー内で全章共通）も ephemeral でキャッシュ
//
// Anthropic SDKはJSON経由で cache_control: ephemeral を渡すだけでよい。
// ここでは「2つの cache_control breakpoint」を構築するヘルパーを提供する。
//
// breakpoint構成：
//   1. system プロンプト（全13章で同一）
//   2. user メッセージ先頭の「共通コンテキスト」（命術＋スコア＋ナラティブ＋ユーザー情報、1診断内で同一）
//
// これにより：
//   - 1章目：system 書込（cache_creation） + コンテキスト書込
//   - 2章目以降：system 読出（cache_read） + コンテキスト読出
//
// ターゲット：入力tokenの90%キャッシュヒット率。

import type { ContentBlockSource } from './generator';
import { buildCelestialContext } from './prompts/celestial-context';
import type { ChapterContext } from './types';

/**
 * 章生成用のメッセージブロック配列を構築。
 * ユーザーターン全体で：
 *   [
 *     { type: 'text', text: <共通コンテキスト>, cache_control: { type: 'ephemeral' } },  // breakpoint 2
 *     { type: 'text', text: <章固有指示> }                                                // 末尾は volatile
 *   ]
 */
export function buildUserMessageBlocks(
  ctx: ChapterContext,
  chapterUserPrompt: string,
): ContentBlockSource[] {
  return [
    {
      type: 'text',
      text: buildCelestialContext(ctx),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: chapterUserPrompt,
    },
  ];
}
