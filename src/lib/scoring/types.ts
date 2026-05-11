// スコアリング結果の型定義

import type {
  Big5Axis,
  MbtiAxis,
  EnneaAxis,
  RiasecAxis,
  VakAxis,
  AttachAxis,
  LoveAxis,
  EntreAxis,
} from '@/data/questions';

// ===== 入力 =====
// ユーザーの選択回答：questionId(Q5..Q30) → choiceId('A'..'H')
// ナラティブ回答：questionId(Q31..Q37) → 自由記述（スコアには加味しない、保管のみ）
export interface ScoringInput {
  selectAnswers: Record<string, string>; // 'Q5' -> 'A'
  narrativeAnswers?: Record<string, string>; // 'Q31' -> '自由記述'
}

// ===== 生スコア =====
// 全44軸の素点（重み係数適用後・正規化前）
export interface RawScores {
  big5: Record<Big5Axis, number>;
  mbti: Record<MbtiAxis, number>; // 正値=E/S/T/J 寄り、負値=I/N/F/P 寄り
  ennea: Record<EnneaAxis, number>;
  riasec: Record<RiasecAxis, number>;
  vak: Record<VakAxis, number>;
  attach: Record<AttachAxis, number>;
  love: Record<LoveAxis, number>;
  entre: Record<EntreAxis, number>;
}

// ===== 正規化スコア =====
// 0-100スケール
export type NormalizedScores = RawScores;

// ===== トップタイプ判定 =====

export interface MbtiResult {
  type: string; // 'INTJ' 等
  axes: {
    EI: { letter: 'E' | 'I'; strength: number }; // strengthは0-100
    SN: { letter: 'S' | 'N'; strength: number };
    TF: { letter: 'T' | 'F'; strength: number };
    JP: { letter: 'J' | 'P'; strength: number };
  };
}

export interface EnneaResult {
  main: { code: EnneaAxis; name: string; score: number };
  wing: { code: EnneaAxis; name: string; score: number } | null;
  // メインタイプ表記：例 '5w4'
  expression: string;
}

export interface EntreResult {
  main: { code: EntreAxis; name: string; subtitle: string; score: number };
  sub: { code: EntreAxis; name: string; subtitle: string; score: number };
}

export interface Big5DerivedType {
  // OCEANから16タイプ独自命名（MBTI回避）を導出
  // 仕様書記載：「Big Five 5因子（OCEAN）→ そこから「16タイプ性格」を導出（MBTI回避命名）」
  // 暫定的にBig5の高低パターンから16通りを命名
  code: string; // 'O+C+E+A+' 等の4軸シグネチャ
  label: string; // 独自命名
}

export interface TopTypes {
  mbti: MbtiResult;
  ennea: EnneaResult;
  entre: EntreResult;
  big5DerivedType: Big5DerivedType;
  riasecTop3: { code: RiasecAxis; name: string; score: number }[];
  vakTop: { code: VakAxis; name: string; score: number };
  attachTop: { code: AttachAxis; name: string; score: number };
  loveTop: { code: LoveAxis; name: string; score: number };
}

// ===== 統合結果 =====

export interface ScoreResult {
  raw: RawScores;
  normalized: NormalizedScores;
  topTypes: TopTypes;
  meta: {
    answeredCount: number;
    totalSelectQuestions: number;
    completionRate: number; // 0-1
    weights: { lTouch: number };
    executedAt: string;
    durationMs: number;
  };
}
