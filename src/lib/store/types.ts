// 診断セッションの型定義

export interface UserInfo {
  lastName: string;
  firstName: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM
  birthTimeUnknown: boolean;
  birthPlaceLabel?: string;
  birthPlaceLatitude?: number;
  birthPlaceLongitude?: number;
  birthPlaceUnknown: boolean;
  email?: string;
}

export type RelationshipTag =
  | 'mabudachi'
  | 'tomodachi'
  | 'kyuyu'
  | 'business_partner'
  | 'client'
  | 'kikaku_sankasha'
  | 'shiriai'
  | 'kono_shindan_de_shitta';

export const RELATIONSHIP_LABELS: Record<RelationshipTag, string> = {
  mabudachi: 'マブダチ',
  tomodachi: '友達',
  kyuyu: '旧友',
  business_partner: 'ビジネスパートナー',
  client: 'クライアント',
  kikaku_sankasha: '企画参加者',
  shiriai: '知り合い',
  kono_shindan_de_shitta: 'この診断で知った',
};

// 命術プレビュー（生年月日入力後に即出すサマリ）
export interface CelestialPreviewData {
  numerologyLifePath?: number;
  shengXiao?: string; // 干支
  rarityLine?: string; // 統計的レアさ説明
  doubutsu?: string;
}

export interface DiagnosisState {
  currentStep: number; // 1〜40
  userInfo: UserInfo;
  selectAnswers: Record<string, string>; // 'Q5' -> 'A'
  narrativeAnswers: Record<string, string>; // 'Q31' -> '〜'
  styleSample: string; // Step 38
  relationshipTag?: RelationshipTag;
  celestialPreview?: CelestialPreviewData;
  startedAt: string; // ISO
  lastSavedAt: string; // ISO
  empathyMessages: Record<string, string>; // 'Q5' -> '〜'
}

export type DiagnosisAction =
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'GO_TO'; step: number }
  | { type: 'SET_USER_INFO'; patch: Partial<UserInfo> }
  | { type: 'SET_SELECT_ANSWER'; questionId: string; choiceId: string }
  | { type: 'SET_NARRATIVE_ANSWER'; questionId: string; text: string }
  | { type: 'SET_STYLE_SAMPLE'; text: string }
  | { type: 'SET_RELATIONSHIP_TAG'; tag: RelationshipTag }
  | { type: 'SET_CELESTIAL_PREVIEW'; data: CelestialPreviewData }
  | { type: 'SET_EMPATHY_MESSAGE'; questionId: string; text: string }
  | { type: 'HYDRATE'; state: DiagnosisState }
  | { type: 'RESET' };

// 診断ステップ定義（33問・体系選定版）
// 18問は scripts/analyze-question-coverage.ts のグリーディ選定で導出。
// 40軸中39軸を最低3問でカバー（L-Touchのみ2問は元データの配点制約）。
// 各軸平均11問/軸で十分なスコア精度を確保。
// 自由記述は8問（Q31〜Q38）。Q38は最終総まとめ自由記述。
export const TOTAL_STEPS = 33;

// 体系選定された多軸選択 18問（Q5-Q30から軸カバー最大化で抽出）
export const SELECT_STEP_QIDS = [
  'Q5', 'Q6', 'Q8', 'Q9', 'Q11', 'Q13', 'Q15', 'Q17', 'Q18',
  'Q19', 'Q21', 'Q22', 'Q24', 'Q25', 'Q26', 'Q27', 'Q29', 'Q30',
] as const;

// 自由記述（あなた自身の言葉）8問：YOフィードバック「尊敬する人と無償活動も良かった、最後に1問追加」を反映
export const NARRATIVE_STEP_QIDS = ['Q31', 'Q32', 'Q33', 'Q34', 'Q35', 'Q36', 'Q37', 'Q38'] as const;

export const CHAPTERS = [
  { id: 'profile', title: 'プロフィール', from: 1, to: 4 },
  { id: 'select-1', title: '日常と気質', from: 5, to: 10 },
  { id: 'select-2', title: '人との関わり', from: 11, to: 16 },
  { id: 'select-3', title: '価値観と仕事', from: 17, to: 22 },
  { id: 'narrative', title: 'あなた自身の言葉', from: 23, to: 30 },
  { id: 'style', title: '文体サンプル', from: 31, to: 31 },
  { id: 'finalize', title: '最終確認', from: 32, to: 33 },
] as const;

export function getCurrentChapter(step: number) {
  return CHAPTERS.find((c) => step >= c.from && step <= c.to) ?? CHAPTERS[0];
}

// ステップ→質問ID変換（33問版）
export function stepToQuestionId(step: number): string | null {
  // Step 5-22 → SELECT_STEP_QIDS の各要素（18問）
  if (step >= 5 && step <= 22) return SELECT_STEP_QIDS[step - 5] ?? null;
  // Step 23-30 → NARRATIVE_STEP_QIDS の各要素（8問）
  if (step >= 23 && step <= 30) return NARRATIVE_STEP_QIDS[step - 23] ?? null;
  return null;
}

// LocalStorage キー（24h TTL）
// v1 = 旧40問仕様（2026-05-04 まで）
// v2 = 30問仕様（2026-05-05 早朝）
// v3 = 33問仕様（2026-05-05 朝〜）— v2 が残ると Step 31-33 routing で旧値を踏むため破壊的バージョンアップ
export const STORAGE_KEY = 'dna-shindan-ai:session-v3';
export const STORAGE_KEY_LEGACY = ['dna-shindan-ai:session-v1', 'dna-shindan-ai:session-v2'] as const;
export const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;
