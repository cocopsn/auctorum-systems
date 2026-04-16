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

    // HALLUCINATION GUARD: detect if bot confirmed appointment without actual create_appointment success
    const confirmationPhrases = [
      'ha sido agendada',
      'cita confirmada',
      'queda confirmada',
      'cita queda',
      'queda agendada',
      'queda registrada',
      'queda reservada',
      'está agendada',
      'está confirmada',
      'se agendó',
      'fue agendada',
      'he agendado',
      'hemos agendado',
      'agendé la',
      'agendé su',
      'listo, agendado',
      'ya quedó',
      'cita fue',
      'reservé',
      'cita registrada',
    ];
    const answerLower = answer.toLowerCase();
    const claimedAgendamiento = confirmationPhrases.some((ph) => answerLower.includes(ph));
    const actualCreateSuccess = allToolCalls.some(
      (tc) => tc.tool === 'create_appointment' && tc.success === true
    );

    if (claimedAgendamiento && !actualCreateSuccess) {
      console.warn(
        `[ai/tools] HALLUCINATION DETECTED — bot claimed cita agendada without create_appointment success. Forcing regeneration.`
      );
      console.warn(`[ai/tools] Offending answer: ${answer.substring(0, 200)}`);

      // Force regeneration with explicit correction
      messages.push({
        role: 'assistant',
        content: answer,
      });
      messages.push({
        role: 'system',
        content: `ERROR: Respondiste al paciente confirmando agendamiento pero NO llamaste create_appointment. Esto es una alucinación grave.

Si el paciente ya te dio todos los datos, LLAMA create_appointment ahora.
Si falta algún dato, PREGUNTA lo que falta al paciente (NO confirmes).

Responde correctamente.`,
      });

      const correctiveRes = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          tools: WHATSAPP_TOOLS,
          tool_choice: 'auto',
          temperature: 0.5,
        }),
      });
      const correctiveData: any = await correctiveRes.json();
      const correctiveChoice = correctiveData.choices?.[0];
      const correctiveMessage = correctiveChoice?.message;

      if (correctiveMessage?.tool_calls && correctiveMessage.tool_calls.length > 0) {
        // Bot now called tools — execute them
        messages.push({
          role: 'assistant',
          content: correctiveMessage.content ?? '',
          tool_calls: correctiveMessage.tool_calls,
        });

        for (const tc of correctiveMessage.tool_calls) {
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {}
          console.log(`[ai/tools] CORRECTIVE executing ${tc.function.name} with args:`, JSON.stringify(args));
          const result = await executeToolCall(tenant, tc.function.name, args);
          allToolCalls.push(result);
          console.log(
            `[ai/tools] CORRECTIVE ${tc.function.name} -> success=${result.success}`,
            result.error ? `error=${result.error}` : ''
          );
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        // Get final answer after corrective tools
        const finalRes = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
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
        const finalData: any = await finalRes.json();
        const finalAnswer = finalData.choices?.[0]?.message?.content ?? answer;

        return {
          answer: finalAnswer,
          model: data.model ?? model,
          latencyMs: Date.now() - startTime,
          toolCalls: allToolCalls,
          rounds: rounds + 1,
        };
      } else {
        // Bot regenerated text-only — use corrective response
        const correctiveAnswer = correctiveMessage?.content ?? answer;
        return {
          answer: correctiveAnswer,
          model: data.model ?? model,
          latencyMs: Date.now() - startTime,
          toolCalls: allToolCalls,
          rounds: rounds + 1,
        };
      }
    }

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
