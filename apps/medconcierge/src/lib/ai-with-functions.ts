/**
 * Enhanced AI runner with OpenAI function calling support.
 * Used by the WhatsApp webhook for appointment scheduling via chat.
 */

import { db, aiUsageEvents, type Tenant, type TenantConfig } from "@quote-engine/db"
import { getAiSettings, DEFAULT_AI_SETTINGS } from "@quote-engine/ai"

const OPENAI_BASE_URL = "https://api.openai.com/v1"
const WHATSAPP_TIMEOUT_MS = 25_000 // Extended for function calling

const FALLBACK_ERROR_MESSAGE =
  "Disculpe, estoy teniendo dificultades tecnicas. Por favor intente de nuevo en unos minutos, o llame directamente al +52 844 664 4307."

type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[] }

interface WhatsAppFunctionCallResult {
  answer: string
  model: string
  latencyMs: number
  inputTokens: number | null
  outputTokens: number | null
  functionsCalled: string[]
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "check_availability",
      description: "Verificar disponibilidad de citas para una fecha especifica",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "book_appointment",
      description: "Agendar una cita para un paciente",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string", description: "Nombre completo del paciente" },
          date: { type: "string", description: "Fecha YYYY-MM-DD" },
          time: { type: "string", description: "Hora HH:MM (24h)" },
          reason: { type: "string", description: "Motivo de la consulta" },
        },
        required: ["patient_name", "date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_appointment",
      description: "Cancelar una cita existente del paciente",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "ID de la cita a cancelar" },
        },
        required: ["appointment_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_patient_appointments",
      description: "Obtener las citas programadas de un paciente",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Numero de telefono del paciente" },
        },
        required: ["phone"],
      },
    },
  },
]

export async function runWhatsAppReplyWithFunctions({
  tenant,
  messageHistory,
  incomingMessage,
  phone,
  dispatchFunction,
}: {
  tenant: Tenant
  messageHistory: Array<{ direction: string; content: string }>
  incomingMessage: string
  phone: string
  dispatchFunction: (name: string, args: any, tenantId: string, phone: string, tenant: Tenant) => Promise<string>
}): Promise<WhatsAppFunctionCallResult> {
  const startedAt = Date.now()
  const settings = getAiSettings(tenant)

  if (!settings.enabled) {
    throw new Error("AI is disabled for this tenant")
  }

  const model = settings.model || "gpt-4o-mini"
  const systemPrompt = settings.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt
  const config = tenant.config as TenantConfig

  // Build enhanced system prompt with context
  const today = new Date().toISOString().split("T")[0]
  const dayName = new Date().toLocaleDateString("es-MX", { weekday: "long" })
  const enhancedPrompt = `${systemPrompt}

CONTEXTO DEL CONSULTORIO:
- Nombre: ${tenant.name}
- Especialidad: ${config.medical?.specialty || "General"}
- Telefono: ${config.contact?.phone || "N/A"}
- Direccion: ${config.contact?.address || "N/A"}
- Fecha de hoy: ${today} (${dayName})
- Duracion de citas: ${config.medical?.consultation_duration_min || 30} minutos
- Costo consulta: $${config.medical?.consultation_fee || "N/A"} MXN

INSTRUCCIONES DE AGENDAMIENTO:
- Cuando el paciente quiera agendar una cita, usa check_availability para ver horarios libres
- Cuando tengas nombre, fecha, hora y motivo, usa book_appointment para confirmar
- Si el paciente quiere ver sus citas, usa get_patient_appointments
- Si quiere cancelar, busca sus citas primero y luego usa cancel_appointment
- Siempre confirma los datos antes de agendar
- Responde siempre en espanol, de forma clara y amigable`

  const chatMessages: ChatMessage[] = [
    { role: "system", content: enhancedPrompt },
  ]

  for (const msg of messageHistory) {
    chatMessages.push({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: msg.content,
    })
  }

  chatMessages.push({ role: "user", content: incomingMessage })

  const functionsCalled: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0

  try {
    // First API call
    let response = await callOpenAI(model, chatMessages, settings)
    totalInputTokens += response.usage?.prompt_tokens || 0
    totalOutputTokens += response.usage?.completion_tokens || 0

    const choice = response.choices?.[0]

    // Handle function calls (loop for multi-step)
    let currentChoice = choice
    let iterations = 0
    const MAX_ITERATIONS = 3

    while (currentChoice?.finish_reason === "tool_calls" && iterations < MAX_ITERATIONS) {
      iterations++
      const toolCalls = currentChoice.message?.tool_calls || []

      // Add assistant message with tool calls
      chatMessages.push({
        role: "assistant",
        content: currentChoice.message?.content || "",
        tool_calls: toolCalls,
      })

      // Execute each function call
      for (const toolCall of toolCalls) {
        const fnName = toolCall.function?.name
        const fnArgs = JSON.parse(toolCall.function?.arguments || "{}")

        console.log(`[ai-functions] Calling ${fnName} with`, fnArgs)
        functionsCalled.push(fnName)

        const result = await dispatchFunction(fnName, fnArgs, tenant.id, phone, tenant)

        chatMessages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        })
      }

      // Call OpenAI again with function results
      response = await callOpenAI(model, chatMessages, settings)
      totalInputTokens += response.usage?.prompt_tokens || 0
      totalOutputTokens += response.usage?.completion_tokens || 0
      currentChoice = response.choices?.[0]
    }

    const answer = currentChoice?.message?.content?.trim() || "No pude generar una respuesta."
    const latencyMs = Date.now() - startedAt

    // Log usage
    await db.insert(aiUsageEvents).values({
      tenantId: tenant.id,
      channel: "whatsapp",
      prompt: incomingMessage,
      responseSummary: answer.slice(0, 1000),
      model,
      inputTokens: totalInputTokens || null,
      outputTokens: totalOutputTokens || null,
      latencyMs,
      resolved: true,
    }).catch(e => console.error("[ai] failed to log usage:", e))

    return { answer, model, latencyMs, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, functionsCalled }
  } catch (error: any) {
    const latencyMs = Date.now() - startedAt
    const isTimeout = error?.name === "AbortError"

    console.error(`[ai-functions] ${isTimeout ? "TIMEOUT" : "ERROR"} after ${latencyMs}ms:`, error?.message || error)

    await db.insert(aiUsageEvents).values({
      tenantId: tenant.id,
      channel: "whatsapp",
      prompt: incomingMessage,
      responseSummary: `ERROR: ${isTimeout ? "timeout" : error?.message?.slice(0, 200) || "unknown"}`,
      model,
      latencyMs,
      resolved: false,
    }).catch(e => console.error("[ai] failed to log error:", e))

    return {
      answer: FALLBACK_ERROR_MESSAGE,
      model,
      latencyMs,
      inputTokens: null,
      outputTokens: null,
      functionsCalled,
    }
  }
}

async function callOpenAI(model: string, messages: ChatMessage[], settings: any) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY not set")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT_MS)

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOLS,
        max_tokens: settings?.maxTokens || 500,
        temperature: settings?.temperature ?? 0.7,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`OpenAI ${res.status}: ${detail}`)
    }

    return res.json()
  } finally {
    clearTimeout(timer)
  }
}
