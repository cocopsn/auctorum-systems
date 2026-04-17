import { db, aiUsageEvents, type Tenant } from "@quote-engine/db";
import { openaiFetch, openaiFetchWithTimeout } from "./client";
import { getAiSettings } from "./settings";
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_MODEL,
  WHATSAPP_TIMEOUT_MS,
  FALLBACK_ERROR_MESSAGE,
  type ChatMessage,
  type ChatResponse,
  type WhatsAppReplyResult,
} from "./types";

function extractResponseText(response: any): string {
  if (typeof response.output_text === "string") return response.output_text;
  const chunks =
    response.output?.flatMap((item: any) => item.content ?? []) ?? [];
  const text = chunks
    .map((content: any) => content.text ?? content.value ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "No pude generar una respuesta en este momento.";
}

export async function runPlayground({
  tenant,
  userId,
  message,
}: {
  tenant: Tenant;
  userId: string;
  message: string;
}): Promise<ChatResponse> {
  const startedAt = Date.now();
  const settings = getAiSettings(tenant);
  const model = settings.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const tools = settings.vectorStoreId
    ? [{ type: "file_search", vector_store_ids: [settings.vectorStoreId] }]
    : [];

  const response = await openaiFetch<any>("/responses", {
    method: "POST",
    body: JSON.stringify({
      model,
      instructions: settings.systemPrompt,
      input: message,
      tools,
    }),
  });

  const answer = extractResponseText(response);
  const latencyMs = Date.now() - startedAt;

  await db.insert(aiUsageEvents).values({
    tenantId: tenant.id,
    userId,
    channel: "playground",
    prompt: message,
    responseSummary: answer.slice(0, 1000),
    model,
    responseId: response.id ?? null,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    latencyMs,
    resolved: true,
  });

  return { answer, responseId: response.id ?? null, model, latencyMs };
}

export async function runWhatsAppReply({
  tenant,
  messageHistory,
  incomingMessage,
}: {
  tenant: Tenant;
  messageHistory: Array<{ direction: string; content: string }>;
  incomingMessage: string;
}): Promise<WhatsAppReplyResult> {
  const startedAt = Date.now();
  const settings = getAiSettings(tenant);

  if (!settings.enabled) {
    throw new Error("AI is disabled for this tenant");
  }

  const model = settings.model || DEFAULT_MODEL;
  const systemPrompt =
    settings.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt;

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messageHistory) {
    chatMessages.push({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: msg.content,
    });
  }

  chatMessages.push({ role: "user", content: incomingMessage });

  try {
    const response = await openaiFetchWithTimeout<{
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>(
      "/chat/completions",
      {
        method: "POST",
        body: JSON.stringify({
          model,
          messages: chatMessages,
          max_tokens: settings.maxTokens || 300,
          temperature: settings.temperature ?? 0.7,
        }),
      },
      WHATSAPP_TIMEOUT_MS,
    );

    const answer =
      response.choices?.[0]?.message?.content?.trim() ||
      "No pude generar una respuesta en este momento.";
    const latencyMs = Date.now() - startedAt;
    const inputTokens = response.usage?.prompt_tokens ?? null;
    const outputTokens = response.usage?.completion_tokens ?? null;

    await db
      .insert(aiUsageEvents)
      .values({
        tenantId: tenant.id,
        channel: "whatsapp",
        prompt: incomingMessage,
        responseSummary: answer.slice(0, 1000),
        model,
        inputTokens,
        outputTokens,
        latencyMs,
        resolved: true,
      })
      .catch((e) =>
        console.error("[ai] failed to log usage event:", e),
      );

    return { answer, responseId: null, model, latencyMs, inputTokens, outputTokens };
  } catch (error: any) {
    const latencyMs = Date.now() - startedAt;
    const isTimeout = error?.name === "AbortError";

    console.error(
      `[ai whatsapp] ${isTimeout ? "TIMEOUT" : "ERROR"} after ${latencyMs}ms:`,
      error?.message || error,
    );

    await db
      .insert(aiUsageEvents)
      .values({
        tenantId: tenant.id,
        channel: "whatsapp",
        prompt: incomingMessage,
        responseSummary: `ERROR: ${isTimeout ? "timeout" : error?.message?.slice(0, 200) || "unknown"}`,
        model,
        latencyMs,
        resolved: false,
      })
      .catch((e) =>
        console.error("[ai] failed to log error event:", e),
      );

    return {
      answer: FALLBACK_ERROR_MESSAGE,
      responseId: null,
      model,
      latencyMs,
      inputTokens: null,
      outputTokens: null,
    };
  }
}
