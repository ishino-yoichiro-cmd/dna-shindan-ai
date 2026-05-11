// スコアリングエンジン統合エクスポート

export { runScoring, runScoringFromAnswers } from './engine';
export {
  emptyRawScores,
  applyWeights,
  normalizeScores,
  L_TOUCH_WEIGHT,
  AXIS_KEYS,
} from './normalizer';
export {
  judgeAllTopTypes,
  judgeMbti,
  judgeEnnea,
  judgeEntre,
  judgeBig5DerivedType,
  judgeRiasecTop3,
  judgeVakTop,
  judgeAttachTop,
  judgeLoveTop,
} from './topTypes';
export type {
  ScoringInput,
  ScoreResult,
  RawScores,
  NormalizedScores,
  TopTypes,
  MbtiResult,
  EnneaResult,
  EntreResult,
  Big5DerivedType,
} from './types';
