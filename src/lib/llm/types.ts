// LLM統合エンジン — 型定義
//
// 13章レポート生成・共感メッセージ生成の共通型。
// 命術16・心理スコア・ナラティブ・ユーザー基本情報を ChapterContext に集約し、
// 各章プロンプトに渡す。

import type { CelestialResult } from '@/lib/celestial/types';
import type { ScoreResult } from '@/lib/scoring/types';

// ============================================================================
// レポート章ID（13章 + 終章 = 13エントリ）
// ============================================================================
//
// report_structure_v1.md：序章 / 1〜11章 / 終章 = 13章。
// 終章は関係性タグで本文が出し分けられる（プロンプトテンプレ内で分岐）。

export const CHAPTER_IDS = [
  'cover',
  'chapter1',
  'chapter2',
  'chapter3',
  'chapter4',
  'chapter5',
  'chapter6',
  'chapter7',
  'chapter8',
  'chapter9',
  'chapter10',
  'chapter11',
  'end',
] as const;

export type ChapterId = (typeof CHAPTER_IDS)[number];

// ============================================================================
// 関係性タグ（database.types.ts の RELATIONSHIP_TAGS と同期）
// ============================================================================

export type RelationshipTag =
  | 'マブダチ'
  | '友達'
  | '旧友'
  | 'ビジネスパートナー'
  | 'クライアント'
  | '企画参加者'
  | '知り合い'
  | 'この診断で知った';

// ============================================================================
// ユーザー基本情報（章プロンプト内で参照）
// ============================================================================

export interface UserProfile {
  fullName: string; // 例: 'サンプル ユーザー'
  familyName?: string;
  givenName?: string;
  birthDate: string; // 'YYYY-MM-DD'
  birthTime?: string; // 'HH:MM'
  birthPlaceName?: string;
  email?: string;
  relationshipTag?: RelationshipTag;
}

// ============================================================================
// ナラティブ8問 + 文体サンプル + NG表現
// ============================================================================
//
// 33問仕様：Q31〜Q38 がナラティブ8問。文体サンプルは別フィールド（styleSample）として扱う。

export interface NarrativeBundle {
  Q31?: string; // 夢中体験 ×3
  Q32?: string; // 怒り・違和感 ×3
  Q33?: string; // 無償でもやってしまう活動 ×1
  Q34?: string; // 譲れない信念 ×3
  Q35?: string; // 褒められた強み ×3
  Q36?: string; // 5年後の未来妄想 ×1
  Q37?: string; // 真似したい人物 / 尊敬する人 ×3
  Q38?: string; // 最終総まとめ自由記述：「分身AIに伝えたいこと」
  styleSample?: string; // 文体サンプル300字（質問IDではなく独立フィールド）
  ngExpressions?: string; // NG表現3つ
}

// ============================================================================
// ChapterContext — 章生成に必要な全情報
// ============================================================================
//
// LLM統合エンジンの主要入力。これを generator に渡せば各章テキストが返る。

export interface ChapterContext {
  user: UserProfile;
  celestial: CelestialResult;
  scores: ScoreResult;
  narrative: NarrativeBundle;
  // 統合タグ（任意）：1章で抽出した10個のキーワード等を後段章で使い回す用
  integrationTags?: string[];
}

// ============================================================================
// LLM 呼び出し結果（章生成）
// ============================================================================

export interface LLMResult {
  chapterId: ChapterId;
  text: string; // Markdown
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number; // 1.25× 課金
    cacheReadInputTokens: number; // 0.1× 課金
  };
  estimatedCostUsd: number; // この章単独のコスト（with cache）
  durationMs: number;
  model: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// 章別プロンプト定義（chapters/*.ts で実装）
// ============================================================================

export interface ChapterPrompt {
  id: ChapterId;
  title: string; // 例: '序章：あなたという奇跡'
  buildUserPrompt: (ctx: ChapterContext) => string;
  // 出力上限の目安（ページ数 × 約500字 ≒ tokens 換算）
  maxOutputTokens: number;
}

// ============================================================================
// 全章生成のサマリ
// ============================================================================

export interface GenerationSummary {
  chapters: Record<ChapterId, LLMResult>;
  totalUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
  totalCostUsd: number;
  durationMs: number;
  successCount: number;
  failureCount: number;
}

// ============================================================================
// 共感メッセージ
// ============================================================================

export interface EmpathyInput {
  questionId: string; // 'Q5' 等
  choiceId: string; // 'A' 等
  choiceText?: string; // 選択肢の本文（任意・あれば精度向上）
  // スコア状態（任意・あれば既存テンプレートとのマッチに使う）
  currentTopAxes?: {
    big5Top?: { axis: string; score: number }[];
    enneaTop?: { axis: string; score: number };
    riasecTop?: { axis: string; score: number };
  };
}

export interface EmpathyResult {
  message: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
  estimatedCostUsd: number;
  durationMs: number;
  fallback: boolean; // テンプレートフォールバックを使ったか
}
