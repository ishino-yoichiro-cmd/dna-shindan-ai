// LLM統合エンジン — エクスポート集約

export {
  getAnthropicClient,
  hasAnthropicApiKey,
  MODEL_DEFAULT,
  MODEL_SONNET_4_6,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
} from './client';

export {
  estimateCost,
  estimateDiagnosisCost,
  estimateTokensFromText,
  SONNET_4_6_PRICING,
  type CostBreakdown,
  type UsageBreakdown,
} from './cost';

export {
  generateChapter,
  generateBatch,
  generateAllChapters,
  generateEmpathy,
  extractIntegrationTags,
  stripIntegrationTagsComment,
  type GenerateChapterOptions,
  type GenerateAllOptions,
  type GenerateEmpathyOptions,
  type ContentBlockSource,
  type BatchGenerateResult,
} from './generator';

export { MODEL_HAIKU } from './generator';

export {
  CHAPTER_IDS,
  type ChapterId,
  type ChapterContext,
  type ChapterPrompt,
  type LLMResult,
  type GenerationSummary,
  type EmpathyInput,
  type EmpathyResult,
  type RelationshipTag,
  type UserProfile,
  type NarrativeBundle,
} from './types';

export { CHAPTER_PROMPTS } from './prompts/chapters';
export { SYSTEM_PROMPT, getSystemPromptBlocks } from './prompts/system';
export { EMPATHY_SYSTEM_PROMPT, getEmpathySystemPromptBlocks } from './prompts/empathy';
export { buildCelestialContext } from './prompts/celestial-context';
export { buildUserMessageBlocks } from './cache';
