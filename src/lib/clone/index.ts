// 分身AI関連モジュール — エクスポート集約

export {
  buildCloneSystemPrompt,
  type CloneSystemPromptInput,
  type CloneSystemPromptOutput,
} from './system-prompt-builder';

export {
  chat,
  chatWithSystemPrompt,
  loadCloneById,
  loadCloneByDiagnosisId,
  type ChatMessage,
  type ChatOptions,
  type ChatResult,
} from './chat-engine';
