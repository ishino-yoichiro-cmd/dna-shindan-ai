// 章プロンプト統合エクスポート
import type { ChapterId, ChapterPrompt } from '../../types';
import { COVER_PROMPT } from './cover';
import { CHAPTER1_PROMPT } from './chapter1-universe';
import { CHAPTER2_PROMPT } from './chapter2-talent';
import { CHAPTER3_PROMPT } from './chapter3-passion';
import { CHAPTER4_PROMPT } from './chapter4-values';
import { CHAPTER5_PROMPT } from './chapter5-love';
import { CHAPTER6_PROMPT } from './chapter6-business';
import { CHAPTER7_PROMPT } from './chapter7-grand';
import { CHAPTER8_PROMPT } from './chapter8-growth';
import { CHAPTER9_PROMPT } from './chapter9-pitfall';
import { CHAPTER10_PROMPT } from './chapter10-calendar';
import { CHAPTER11_PROMPT } from './chapter11-clone';
import { END_PROMPT } from './end';

export const CHAPTER_PROMPTS: Record<ChapterId, ChapterPrompt> = {
  cover: COVER_PROMPT,
  chapter1: CHAPTER1_PROMPT,
  chapter2: CHAPTER2_PROMPT,
  chapter3: CHAPTER3_PROMPT,
  chapter4: CHAPTER4_PROMPT,
  chapter5: CHAPTER5_PROMPT,
  chapter6: CHAPTER6_PROMPT,
  chapter7: CHAPTER7_PROMPT,
  chapter8: CHAPTER8_PROMPT,
  chapter9: CHAPTER9_PROMPT,
  chapter10: CHAPTER10_PROMPT,
  chapter11: CHAPTER11_PROMPT,
  end: END_PROMPT,
};

export {
  COVER_PROMPT,
  CHAPTER1_PROMPT,
  CHAPTER2_PROMPT,
  CHAPTER3_PROMPT,
  CHAPTER4_PROMPT,
  CHAPTER5_PROMPT,
  CHAPTER6_PROMPT,
  CHAPTER7_PROMPT,
  CHAPTER8_PROMPT,
  CHAPTER9_PROMPT,
  CHAPTER10_PROMPT,
  CHAPTER11_PROMPT,
  END_PROMPT,
};
