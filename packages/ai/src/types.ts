import type { Tenant } from "@quote-engine/db";

export type AiSettings = {
  enabled: boolean;
  systemPrompt: string;
  autoSchedule: boolean;
  answerFaq: boolean;
  humanHandoff: boolean;
  model: string;
  vectorStoreId: string | null;
  temperature: number;
  maxTokens: number;
};

export type TenantAIConfig = AiSettings;

export type ChatResponse = {
  answer: string;
  responseId: string | null;
  model: string;
  latencyMs: number;
};

export type WhatsAppReplyResult = ChatResponse & {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type KnowledgeChunk = {
  id: string;
  tenantId: string;
  content: string;
  fileName: string;
  chunkIndex: number;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const DEFAULT_MODEL = "gpt-4o-mini";
export const WHATSAPP_TIMEOUT_MS = 15_000;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  systemPrompt:
    "Eres el concierge de Auctorum para este negocio. Responde de forma clara, breve y profesional. Si no sabes algo, ofrece transferir a un humano.",
  autoSchedule: false,
  answerFaq: true,
  humanHandoff: true,
  model: DEFAULT_MODEL,
  vectorStoreId: null,
  temperature: 0.7,
  maxTokens: 300,
};

export const FALLBACK_ERROR_MESSAGE =
  "Disculpe, estoy teniendo dificultades tecnicas. Por favor intente de nuevo en unos minutos, o llame directamente al +52 844 664 4307.";
