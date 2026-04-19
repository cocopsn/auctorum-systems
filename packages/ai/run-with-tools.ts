/**
 * OpenAI chat completion with function calling loop.
 * Max 3 rounds of tool calls before forcing a final answer.
 */
import type { Tenant } from '@quote-engine/db';
import { WHATSAPP_TOOLS, type ToolCallResult } from './tools';
import { executeToolCall } from './tool-executors';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const MAX_TOOL_ROUNDS = 3;
const MAX_TOTAL_OPENAI_CALLS = 5;

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
  let totalOpenAICalls = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const body: any = {
      model,
      messages,
      tools: WHATSAPP_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
    };

    totalOpenAICalls++;
    if (totalOpenAICalls > MAX_TOTAL_OPENAI_CALLS) { console.warn([ai/tools] max total OpenAI calls reached); break; }
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

    // HALLUCINATION GUARDS: (1) confirmed cita sin create_appointment, (2) mencionó horarios sin check_availability
    // Frases que implican cita creada (SIN create_appointment = alucinación)
    const confirmationPhrases = [
      'cita ha sido agendada',
      'cita queda agendada',
      'cita confirmada',
      'cita queda confirmada',
      'queda confirmada',
      'queda agendada',
      'su cita queda',
      'listo, agendado',
      'ya quedó su cita',
      'ya quedó agendada',
      'se agendó exitosamente',
      'agendé su cita',
      'agendé la cita',
      'he agendado su cita',
      'he agendado la cita',
      'cita creada',
      'reservación confirmada',
      'reserva confirmada',
    ];

    // Frases que implican mostrar horarios (SIN check_availability = alucinación)
    const availabilityFakePatterns = [
      /tengo disponibles? (los siguientes )?horarios?/i,
      /horarios? disponibles?:/i,
      /estos son los horarios?/i,
      /estas? son las? opcion(es)?/i,
      /te ofrezco los siguientes/i,
      /puedo ofrecerte/i,
    ];

    // Detecta horas específicas tipo "09:00 AM", "10:30", "3pm"
    const specificTimePattern = /\d{1,2}[:\.]\d{2}\s*(AM|PM|am|pm|hrs?)?/i;

    const answerLower = answer.toLowerCase();

    // Check 1: bot confirmó agendamiento sin crear cita
    const claimedAgendamiento = confirmationPhrases.some((ph) => answerLower.includes(ph));
    const actualCreateSuccess = allToolCalls.some(
      (tc) => tc.tool === 'create_appointment' && tc.success === true
    );
    const hallucinatedConfirmation = claimedAgendamiento && !actualCreateSuccess;

    // Check 2: bot inventó horarios sin consultar disponibilidad
    const mentionsAvailability = availabilityFakePatterns.some((p) => p.test(answer));
    const mentionsSpecificTimes = specificTimePattern.test(answer);
    const actualCheckAvailCalled = allToolCalls.some(
      (tc) => tc.tool === 'check_availability' && tc.success === true
    );
    const hallucinatedAvailability =
      mentionsAvailability && mentionsSpecificTimes && !actualCheckAvailCalled;

    if (hallucinatedConfirmation || hallucinatedAvailability) {
      const hallucinationType = hallucinatedConfirmation ? 'CONFIRMATION' : 'AVAILABILITY';
      console.warn(
        `[ai/tools] HALLUCINATION DETECTED (${hallucinationType}) — bot ${
          hallucinatedConfirmation
            ? 'claimed cita creada without create_appointment'
            : 'mentioned specific times without check_availability'
        }. Forcing regeneration with tool_choice=required.`
      );
      console.warn(`[ai/tools] Offending answer: ${answer.substring(0, 200)}`);

      // Force regeneration with explicit correction AND tool_choice=required
      messages.push({
        role: 'assistant',
        content: answer,
      });

      const correctionMessage = hallucinatedConfirmation
        ? `ERROR: Respondiste confirmando la cita pero NO llamaste create_appointment. Esto es una alucinación grave.

Si el paciente ya te dio TODOS los datos (nombre, fecha, hora, motivo) y confirmó, LLAMA create_appointment AHORA con esos datos.
Si falta algún dato, PREGUNTA lo que falta en lugar de confirmar.

Responde correctamente llamando la tool necesaria.`
        : `ERROR: Mencionaste horarios específicos pero NO llamaste check_availability. Esto es una alucinación grave — estás inventando disponibilidad sin consultar el calendario real.

LLAMA check_availability(date) AHORA con la fecha que el paciente mencionó para obtener los slots REALES disponibles.
NUNCA inventes horarios.

Responde correctamente llamando check_availability.`;

      messages.push({
        role: 'system',
        content: correctionMessage,
      });

      totalOpenAICalls++;
      if (totalOpenAICalls > MAX_TOTAL_OPENAI_CALLS) { console.warn([ai/tools] max total OpenAI calls reached); break; }
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
          tool_choice: 'required',
          temperature: 0.3,
        }),
      });
      const correctiveData: any = await correctiveRes.json();
      const correctiveChoice = correctiveData.choices?.[0];
      const correctiveMessage = correctiveChoice?.message;

      if (correctiveMessage?.tool_calls && correctiveMessage.tool_calls.length > 0) {
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
          console.log(
            `[ai/tools] CORRECTIVE executing ${tc.function.name}`,
            JSON.stringify(args)
          );
          const result = await executeToolCall(tenant, tc.function.name, args);
          allToolCalls.push(result);
          console.log(`[ai/tools] CORRECTIVE ${tc.function.name} -> success=${result.success}`);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        // Get final answer after corrective tools (allow chained tool calls)
        totalOpenAICalls++;
        if (totalOpenAICalls > MAX_TOTAL_OPENAI_CALLS) { console.warn([ai/tools] max total OpenAI calls reached); break; }
        const finalRes = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
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
            temperature: 0.7,
          }),
        });
        const finalData: any = await finalRes.json();
        const finalMessage = finalData.choices?.[0]?.message;

        // Chained tool calls (ej: check_availability -> create_appointment)
        if (finalMessage?.tool_calls && finalMessage.tool_calls.length > 0) {
          messages.push({
            role: 'assistant',
            content: finalMessage.content ?? '',
            tool_calls: finalMessage.tool_calls,
          });
          for (const tc of finalMessage.tool_calls) {
            let args: Record<string, any> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {}
            console.log(`[ai/tools] CHAINED executing ${tc.function.name}`, JSON.stringify(args));
            const result = await executeToolCall(tenant, tc.function.name, args);
            allToolCalls.push(result);
            console.log(`[ai/tools] CHAINED ${tc.function.name} -> success=${result.success}`);
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
          // Final answer after chained tools
          totalOpenAICalls++;
          if (totalOpenAICalls > MAX_TOTAL_OPENAI_CALLS) { console.warn([ai/tools] max total OpenAI calls reached); break; }
          const lastRes = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
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
          const lastData: any = await lastRes.json();
          return {
            answer: lastData.choices?.[0]?.message?.content ?? answer,
            model: data.model ?? model,
            latencyMs: Date.now() - startTime,
            toolCalls: allToolCalls,
            rounds: rounds + 2,
          };
        }

        return {
          answer: finalMessage?.content ?? answer,
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
