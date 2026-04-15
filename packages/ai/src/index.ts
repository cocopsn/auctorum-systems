// Types
export type {
  AiSettings,
  TenantAIConfig,
  ChatResponse,
  WhatsAppReplyResult,
  KnowledgeChunk,
  ChatMessage,
} from "./types";
export { DEFAULT_AI_SETTINGS, DEFAULT_MODEL, FALLBACK_ERROR_MESSAGE } from "./types";

// Client
export { openaiFetch, openaiFetchWithTimeout } from "./client";

// Settings
export { getAiSettings, saveAiSettings } from "./settings";

// Chat
export { runPlayground, runWhatsAppReply } from "./chat";

// Embeddings
export { generateEmbedding } from "./embeddings";

// Knowledge
export {
  ensureVectorStore,
  validateKnowledgeFile,
  uploadKnowledgeFile,
  listKnowledgeFiles,
  deleteKnowledgeFile,
  getAiUsageSummary,
} from "./knowledge";
