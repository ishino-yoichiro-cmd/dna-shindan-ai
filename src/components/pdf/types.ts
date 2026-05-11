// PDFレポート用の入力データ型定義
// Phase 2-Cで実LLM統合する時に置換される構造

import type { CelestialResult } from '@/lib/celestial/types';

// 関係性タグ8種別
export type RelationshipTag =
  | 'マブダチ'
  | '友達'
  | '旧友'
  | 'ビジネスパートナー'
  | 'クライアント'
  | '企画参加者'
  | '知り合い'
  | 'この診断で知った';

// ユーザー基本情報
export type UserInfo = {
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM
  birthPlace?: string; // 表示用
  email?: string;
  styleSample?: string; // 文体サンプル300字
  ngExpressions?: string[]; // NG表現
};

// 心理スコア（Phase 2-Bで実装）
export type Scores = {
  bigFive?: { O: number; C: number; E: number; A: number; N: number };
  bigFiveType?: string; // 16タイプ命名
  enneagram?: { primary: number; wing: number };
  riasec?: { R: number; I: number; A: number; S: number; E: number; C: number; top3: string[] };
  vak?: { V: number; A: number; K: number };
  attachment?: 'secure' | 'avoidant' | 'anxious' | 'fearful';
  loveLanguage?: { time: number; words: number; touch: number; gifts: number; acts: number };
  entrepreneur?: { primary: string; secondary: string };
};

// LLM生成テキスト（Phase 2-Cで実装）
// 各章のセクション本文を保持。ダミー時はreport_structure_v1.mdのリード文を使う
export type LlmContent = {
  // 序章
  cover?: {
    leadText: string;
    rarityLine: string; // 「◯◯人に1人」
    closingLine: string; // 文体サンプル引用
  };
  // 1章
  chapter1?: {
    leadText: string;
    threeAlignments: string[]; // 3一致
    twoConflicts: string[]; // 2矛盾
    coreSummary: string; // 500字
    integrationTags: string[]; // 統合タグ10個
  };
  // 2章
  chapter2?: {
    leadText: string;
    threeFingers: { name: string; scene: string }[]; // 3つの指紋
    monetizeStep: string;
  };
  // 3章
  chapter3?: {
    leadText: string;
    immersionExperiences: string[]; // 夢中体験3つ要約
    threeConditions: string[]; // 燃える3条件
    weeklyDesign: string;
  };
  // 4章
  chapter4?: {
    leadText: string;
    angerExcerpts: string[];
    beliefs: string[];
    coreValues: string[]; // 3つに圧縮
    decisionRule: string; // 一行ルール
  };
  // 5章
  chapter5?: {
    leadText: string;
    loveProfile: string;
    attachmentLine: string;
    maxActions: string[]; // 最大値3つ
    drainActions: string[]; // 消耗3つ
  };
  // 6章
  chapter6?: {
    leadText: string;
    entrepreneurType: string;
    riasecLine: string;
    industries: string[];
    threeScenarios: { title: string; body: string }[]; // A/B/C
    avoidStructure: string;
    positioning: string; // 1行
  };
  // 7章
  chapter7?: {
    leadText: string;
    ikigai: { likes: string[]; skills: string[]; world: string[]; money: string[] };
    keywords: string[]; // 3つ
    fiveYearVision: string; // Q36引用要約
    roadmap: { year: number; goal: string }[];
    turningPoint: string;
    futureLine: string;
  };
  // 8章
  chapter8?: {
    leadText: string;
    threeMonths: string[]; // 3つ
    oneYear: string[]; // 3つ
    threeYears: string[]; // 3つ
    dontList: string[];
    summaryLine: string; // 一行サマリー
  };
  // 9章
  chapter9?: {
    leadText: string;
    threePitfalls: { situation: string; sign: string; escape: string }[];
    selfPhrase: string;
  };
  // 10章
  chapter10?: {
    leadText: string;
    overview: string;
    months12: { month: string; theme: string; trap: string; action: string }[];
    keyMonths: { type: '攻め' | '休む' | '転換'; month: string; note: string }[];
    yearAfterLine: string;
  };
  // 11章
  chapter11?: {
    leadText: string;
    transplantedItems: string[];
    capabilities: string[];
    cloneUrl: string;
    qrCodeDataUrl?: string; // Phase 2-Gで生成
    sampleUseCases: string[]; // 3つ
    starterPrompts: string[]; // 5つ
  };
  // 終章
  ending?: {
    relationshipMessage: string; // 200字（タグ別）
    commonClosing: string; // 共通の締め120字
  };
};

// PDF生成ファサードへの入力
export type ReportProps = {
  celestial: CelestialResult;
  scores: Scores;
  llmContent: LlmContent;
  userInfo: UserInfo;
  relationshipTag: RelationshipTag;
};
