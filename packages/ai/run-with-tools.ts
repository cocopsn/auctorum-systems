/**
 * OpenAI chat completion with function calling loop.
 * Max 3 rounds of tool calls before forcing a final answer.
 */
import type { Tenant } from '@quote-engine/db';
import { WHATSAPP_TOOLS, type ToolCallResult } from './tools';
import { executeToolCall } from './tool-executors';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const MAX_TOOL_ROUNDS = 3;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

export type RunWithToolsParams = {
  tenant: Tenant;
  systemPrompt: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  incomingMessage: string;
  model?: string;
};

export type RunWithToolsResult = {
  answer: string;
  model: string;
  latencyMs: number;
  toolCalls: ToolCallResult[];
  rounds: number;
};

export async function runWhatsAppReplyWithTools(
  params: RunWithToolsParams
): Promise<RunWithToolsResult> {
  const { tenant, systemPrompt, messageHistory, incomingMessage, model = 'gpt-4o-mini' } = params;
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messageHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: incomingMessage },
  ];

  const allToolCalls: ToolCallResult[] = [];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const body: any = {
      model,
      messages,
      tools: WHATSAPP_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
    };

    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }
    const data: any = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) {
      throw new Error('OpenAI returned no message');
    }

    // If model called tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: message.content ?? '',
        tool_calls: message.tool_calls,
      });

      for (const tc of message.tool_calls) {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch (e) {
          console.warn(`[ai/tools] failed parsing args for ${tc.function.name}:`, e);
        }
        console.log(
          `[ai/tools] executing ${tc.function.name} with args:`,
          JSON.stringify(args)
        );

        const result = await executeToolCall(tenant, tc.function.name, args);
        allToolCalls.push(result);

        console.log(
          `[ai/tools] ${tc.function.name} -> success=${result.success}`,
          result.error ? `error=${result.error}` : ''
        );

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    // No more tool calls — final answer
    const answer = message.content ?? '';
    return {
      answer,
      model: data.model ?? model,
      latencyMs: Date.now() - startTime,
      toolCalls: allToolCalls,
      rounds,
    };
  }

  // Max rounds reached — force final answer
  console.warn(
    `[ai/tools] max tool rounds (${MAX_TOOL_ROUNDS}) reached, forcing final answer`
  );
  messages.push({
    role: 'system',
    content:
      'Ya tienes toda la información necesaria. Responde al paciente con una respuesta final en texto natural, sin llamar más tools.',
  });

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tool_choice: 'none',
      temperature: 0.7,
    }),
  });
  const data: any = await res.json();
  const answer =
    data.choices?.[0]?.message?.content ??
    'Lo siento, no pude procesar tu solicitud. Intenta de nuevo.';

  return {
    answer,
    model: data.model ?? model,
    latencyMs: Date.now() - startTime,
    toolCalls: allToolCalls,
    rounds,
  };
}
