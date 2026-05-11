/**
 * BullMQ Worker — processes WhatsApp AI messages off the main thread.
 *
 * Usage: npx tsx scripts/worker.ts
 * PM2:   pm2 start npx --name auctorum-worker -- tsx scripts/worker.ts
 */

// Use relative imports since scripts/ is at repo root and pnpm strict mode
// does not hoist workspace packages to root node_modules.
import { createWorker, createQueue, closeAll, getConnection, type Job, type AuctorumJobPayload } from '../packages/queue/src/index';
import { redactPhone, redactName } from '../packages/notifications/redact';
import {
  db,
  conversations,
  messages,
  clients,
  tenants,
  patients,
  notifications,
  type Tenant,
  botInstances,
  doctors,
} from '../packages/db/index';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import {
  getAiSettings,
  runWhatsAppReply,
  runWhatsAppReplyWithTools,
  searchKnowledgeBase,
  buildTenantSystemPrompt,
  checkTenantBudget,
  runWithDoctorContext,
  // Resilience + metering
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  generateFallbackResponse,
  checkAndTrackUsage,
} from '../packages/ai/index';

const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'America/Monterrey'

// --------------- WhatsApp send (inlined to avoid Next.js path aliases) ---------------

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('52') && digits.length >= 12) return digits;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return false;

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'text',
        text: { body },
      }),
    });
    if (!res.ok) {
      console.error('[worker] WhatsApp API error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[worker] WhatsApp send error:', err);
    return false;
  }
}


// H-6: Per-tenant WhatsApp send — reads phone_number_id from bot_instances
async function getPhoneNumberIdForTenant(tenantId: string): Promise<string | null> {
  const [bot] = await db
    .select({ config: botInstances.config })
    .from(botInstances)
    .where(and(eq(botInstances.tenantId, tenantId), eq(botInstances.channel, 'whatsapp'), eq(botInstances.status, 'active')))
    .limit(1);
  return (bot?.config as any)?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null;
}

// --------------- Tenant resolution ---------------

async function resolveTenant(normalized: string): Promise<{ tenant: Tenant; tenantId: string } | null> {
  // Match patient by phone number (exact last-10-digits match)
  const [matchedPatient] = await db
    .select({ tenantId: patients.tenantId })
    .from(patients)
    .where(
      sql`LENGTH(${normalized}) >= 10 AND RIGHT(REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g'), 10) = RIGHT(${normalized}, 10)`
    )
    .limit(1);

  if (!matchedPatient) {
    // C-3: Do NOT fall back to arbitrary tenant. Reject unknown numbers.
    console.warn(`[worker] REJECTED: No patient match for phone ${normalized}. No fallback.`);
    return null;
  }

  const tenantId = matchedPatient.tenantId;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return null;
  return { tenant, tenantId };
}

// --------------- Conversation helpers ---------------

async function getOrCreateConversation(tenantId: string, phone: string, normalized: string) {
  let [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.tenantId, tenantId), sql`LENGTH(${normalized}) >= 7 AND RIGHT(REGEXP_REPLACE(${clients.phone}, '[^0-9]', '', 'g'), 10) = RIGHT(${normalized}, 10)`))
    .limit(1);

  if (!client) {
    const [created] = await db
      .insert(clients)
      .values({ tenantId, name: `WhatsApp ${phone}`, phone, status: 'lead' })
      .returning();
    client = created;
  }

  let [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.tenantId, tenantId), eq(conversations.clientId, client.id), eq(conversations.channel, 'whatsapp'), eq(conversations.status, 'open')))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (!conv) {
    const [created] = await db
      .insert(conversations)
      .values({ tenantId, clientId: client.id, channel: 'whatsapp', status: 'open', lastMessageAt: new Date() })
      .returning();
    conv = created;
  }

  return { client, conversation: conv };
}

async function loadHistory(conversationId: string, limit = 20) {
  const rows = await db
    .select({ direction: messages.direction, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

// --------------- Job processor ---------------

async function processWhatsAppMessage(job: Job<AuctorumJobPayload>) {
  // Accept both payload shapes:
  //  - scripts/worker legacy: { tenant_id, from, text, external_id }
  //  - webhook (packages/events): { tenantId, phone, phoneNumberId, text, externalId, timestamp }
  const data = job.data as Record<string, any>;
  const hintedTenantId: string | null = data.tenantId ?? data.tenant_id ?? null;
  const from: string = data.phone ?? data.from ?? '';
  const text: string = data.text ?? '';
  const external_id: string | null = data.externalId ?? data.external_id ?? null;
  // phoneNumberId reserved for future bot_instances routing:
  // const phoneNumberId: string | null = data.phoneNumberId ?? null;

  const normalized = (from || '').replace(/\D/g, '').replace(/^52/, '');
  if (!normalized || !text) throw new Error('Missing from or text');

  // Trust hinted tenantId from webhook (already resolved via integrations).
  // Fall back to patient/medical lookup if not provided.
  let tenant: Tenant | null = null;
  let tenantId: string | null = null;
  if (hintedTenantId) {
    const [t] = await db.select().from(tenants).where(eq(tenants.id, hintedTenantId)).limit(1);
    if (t) {
      tenant = t;
      tenantId = t.id;
    }
  }
  if (!tenant) {
    const resolved = await resolveTenant(normalized);
    if (!resolved) {
      console.log(`[worker] no tenant found for phone ${normalized}`);
      return;
    }
    tenant = resolved.tenant;
    tenantId = resolved.tenantId;
  }

  const settings = getAiSettings(tenant);
  if (!settings.enabled) {
    console.log(`[worker] AI disabled for tenant ${tenant.slug}`);
    return;
  }

  // Budget check (non-blocking on failure, soft stop on hard limit).
  const budget = await checkTenantBudget(tenantId!, (tenant as any).plan);
  if (!budget.canProceed) {
    console.warn(`[worker] tenant ${tenant.slug} over budget: ${budget.reason}`);
    await sendWhatsAppMessage(
      from,
      'Hemos alcanzado el limite diario de consultas automatizadas. Un asesor te contactara pronto.',
    );
    return;
  }

  // H-3: Per-phone rate limiting (20 messages per hour)
  const redis = getConnection();
  const rateLimitKey = `ratelimit:phone:${normalized}:${Math.floor(Date.now() / 3600000)}`;
  const msgCount = await redis.incr(rateLimitKey);
  if (msgCount === 1) await redis.expire(rateLimitKey, 3600);
  if (msgCount > 20) {
    console.warn(`[worker] Rate limited phone ${normalized}: ${msgCount} msgs in current hour`);
    await sendWhatsAppMessage(from, 'Has enviado muchos mensajes. Por favor espera unos minutos antes de continuar.');
    return;
  }

  const { conversation } = await getOrCreateConversation(tenantId, from, normalized);

  if ((conversation as any).botPaused) {
    console.log(`[worker] bot paused for conversation ${conversation.id}`);
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'inbound',
      senderType: 'client',
      content: text,
      externalId: external_id,
    });
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date(), unreadCount: sql`${conversations.unreadCount} + 1`, updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));
    return;
  }

  // Save inbound message
  await db.insert(messages).values({
    conversationId: conversation.id,
    direction: 'inbound',
    senderType: 'client',
    content: text,
    externalId: external_id,
  });

  // WhatsApp opt-out detection — required by WhatsApp Business Policy.
  // If the inbound message is an opt-out keyword we flip the patient's
  // whatsapp_opted_out_at, ack with a confirmation, and skip the AI
  // round. Re-opt-in via the keyword "ALTA" or "SUBSCRIBE".
  const OPT_OUT_KEYWORDS = ['baja', 'stop', 'cancelar mensajes', 'no más', 'no mas', 'dejar de recibir', 'unsubscribe']
  const OPT_IN_KEYWORDS = ['alta', 'subscribe', 'reactivar']
  const textLc = text.trim().toLowerCase()
  const isOptOut = OPT_OUT_KEYWORDS.some((k) => textLc === k || textLc.startsWith(k + ' ') || textLc.endsWith(' ' + k))
  const isOptIn = OPT_IN_KEYWORDS.some((k) => textLc === k)
  if (isOptOut || isOptIn) {
    try {
      await db.execute(sql`
        UPDATE patients
        SET ${isOptOut
          ? sql`whatsapp_opted_out_at = NOW(), whatsapp_opted_in_at = NULL`
          : sql`whatsapp_opted_in_at = NOW(),  whatsapp_opted_out_at = NULL`},
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid
          AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = ${normalized}
      `)
    } catch (err) {
      console.warn('[worker] opt-in/out update failed:', err instanceof Error ? err.message : err)
    }
    const reply = isOptOut
      ? 'Listo, lo dimos de baja de mensajes promocionales. Seguirá recibiendo confirmaciones y recordatorios de citas. Para volver a suscribirse escriba ALTA.'
      : 'Bienvenido de vuelta. Volvió a la lista de mensajes promocionales.'
    await sendWhatsAppMessage(from, reply)
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'outbound',
      senderType: 'system',
      content: reply,
    })
    return
  }

  // Load history
  const history = await loadHistory(conversation.id, 20);

  // RAG: pull top-3 chunks from tenant knowledge_base (soft-fails to []).
  const ragChunks = await searchKnowledgeBase({
    tenantId: tenantId!,
    query: text,
    topK: 3,
  });
  if (ragChunks.length > 0) {
    console.log(`[worker] RAG matched ${ragChunks.length} chunks for tenant=${tenant.slug}`);
  }

  // Build per-tenant system prompt (medical vs industrial template + RAG context).
  // Inject current date/time (America/Monterrey), patient's WhatsApp phone,
  // and explicit next-weekday mapping so the LLM never does date arithmetic wrong.
  const nowInMonterrey = new Date().toLocaleString('sv-SE', {
    timeZone: DEFAULT_TIMEZONE,
  });
  const todayISO = new Date().toLocaleDateString('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
  });
  const dayOfWeekSpanish = new Date().toLocaleDateString('es-MX', {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'long',
  });
  const patientPhoneFull = (from || '').replace(/\D/g, '') || normalized;

  // Build weekday mapping (next occurrence of each weekday in America/Monterrey TZ)
  function getNextWeekdayDate(targetDayIdx: number, tz: string): string {
    const now = new Date();
    const todayInTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const todayIdx = todayInTz.getDay(); // 0=Sun, 1=Mon, ...
    let daysUntil = (targetDayIdx - todayIdx + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // "próximo lunes" = next week if today is Monday
    const target = new Date(todayInTz.getTime() + daysUntil * 24 * 60 * 60 * 1000);
    return target.toISOString().slice(0, 10);
  }

  const weekdayMap = {
    lunes: getNextWeekdayDate(1, DEFAULT_TIMEZONE),
    martes: getNextWeekdayDate(2, DEFAULT_TIMEZONE),
    miercoles: getNextWeekdayDate(3, DEFAULT_TIMEZONE),
    jueves: getNextWeekdayDate(4, DEFAULT_TIMEZONE),
    viernes: getNextWeekdayDate(5, DEFAULT_TIMEZONE),
    sabado: getNextWeekdayDate(6, DEFAULT_TIMEZONE),
    domingo: getNextWeekdayDate(0, DEFAULT_TIMEZONE),
  };

  const contextInjection = `

===== CONTEXTO TEMPORAL Y DE CANAL (información del sistema, NO del paciente) =====

FECHA Y HORA ACTUAL: ${nowInMonterrey} (America/Monterrey)
HOY ES: ${dayOfWeekSpanish}, ${todayISO}

PRÓXIMAS OCURRENCIAS DE DÍAS DE LA SEMANA (usa EXACTAMENTE estas fechas):
- "el lunes" / "próximo lunes" → ${weekdayMap.lunes}
- "el martes" / "próximo martes" → ${weekdayMap.martes}
- "el miércoles" / "próximo miércoles" → ${weekdayMap.miercoles}
- "el jueves" / "próximo jueves" → ${weekdayMap.jueves}
- "el viernes" / "próximo viernes" → ${weekdayMap.viernes}
- "el sábado" / "próximo sábado" → ${weekdayMap.sabado}
- "el domingo" / "próximo domingo" → ${weekdayMap.domingo}

OTROS RELATIVOS:
- "hoy" → ${todayISO}
- "mañana" → calcula ${todayISO} + 1 día
- "pasado mañana" → calcula ${todayISO} + 2 días

NUNCA envíes fechas relativas a los tools. SIEMPRE convierte a YYYY-MM-DD usando la tabla arriba.

NÚMERO DE WHATSAPP DEL PACIENTE: ${patientPhoneFull}

Cuando llames a create_appointment, usa ESE número como patient_phone.
NUNCA preguntes al paciente su número — ya lo tienes por WhatsApp.

===== REGLA ANTI-ALUCINACIÓN (CRÍTICA) =====

JAMÁS respondas al paciente con frases que impliquen que una cita está creada
sin haber llamado la tool create_appointment en ESTA MISMA conversación.

Frases PROHIBIDAS a menos que create_appointment haya retornado success=true:
- "Su cita ha sido agendada"
- "Cita confirmada"
- "Listo, agendado"
- "Ya quedó su cita"
- "Se agendó exitosamente"
- Cualquier variación que afirme agendamiento completado

Si el paciente te da todos los datos en un solo mensaje (nombre, fecha, hora, motivo),
DEBES:
1. Llamar check_availability
2. Llamar create_appointment
3. Solo entonces confirmar con el ID de cita real

NUNCA asumas que "tienes todo" y respondas confirmando. La confirmación requiere
tool execution exitosa.
`;


  // ============ MULTI-DOCTOR CONTEXT ============
  const tenantDoctors = await db.select().from(doctors).where(and(eq(doctors.tenantId, tenantId), eq(doctors.isActive, true)));

  // Detect previously selected doctor from conversation; auto-select for single-doctor tenants.
  let selectedDoctor = null;
  if (tenantDoctors.length === 1) {
    selectedDoctor = tenantDoctors[0];
  } else if (tenantDoctors.length > 1 && (conversation as any).doctorId) {
    selectedDoctor = tenantDoctors.find(d => d.id === (conversation as any).doctorId) || null;
  }

  // The doctor context lives in AsyncLocalStorage, NOT module state.
  // Pre-2026-05-10 we called setDoctorContext on a singleton — under
  // worker concurrency=N, the last write won for ALL parallel jobs and
  // patients ended up assigned other tenants' doctors. We wrap the AI
  // call in runWithDoctorContext so each parallel message has its own
  // isolated frame.
  const doctorCtx = {
    doctors: tenantDoctors,
    selectedDoctor,
    conversationId: conversation.id,
  };

  // Multi-doctor prompt injection
  let multiDoctorPrompt = '';
  if (tenantDoctors.length > 1) {
    const doctorList = tenantDoctors.map((d, i) => `${i + 1}. ${d.name}${d.specialty ? ' - ' + d.specialty : ''}`).join('\n');
    const selectedInfo = selectedDoctor ? `DOCTOR SELECCIONADO PARA ESTA CONVERSACION: ${selectedDoctor.name} (ID: ${selectedDoctor.id})` : 'DOCTOR SELECCIONADO: Ninguno aun';
    multiDoctorPrompt = `

===== CONSULTORIO MULTI-DOCTOR =====

Este consultorio tiene ${tenantDoctors.length} doctores:
${doctorList}

FLUJO MULTI-DOCTOR OBLIGATORIO:
1. Si el paciente NO ha elegido doctor aun, PREGUNTA: "Tenemos ${tenantDoctors.length} doctores disponibles. Con cual desea agendar?" y lista los nombres.
2. Cuando el paciente diga un nombre, llama select_doctor(doctor_name) INMEDIATAMENTE.
3. Una vez seleccionado, usa SOLO el calendario de ese doctor para check_availability y create_appointment.
4. Pasa doctor_id en check_availability y create_appointment.
5. Si el paciente pregunta algo general (horarios, direccion, costos), responde SIN requerir seleccion de doctor.
6. Si el paciente dice "quiero cambiar de doctor", permite cambiar llamando select_doctor con el nuevo nombre.

${selectedInfo}
`;
  }

  const systemPromptOverride = buildTenantSystemPrompt({
    tenant,
    ragChunks: ragChunks.map((c) => c.content),
    customInstructions: (settings.systemPrompt ?? '') + contextInjection + multiDoctorPrompt,
  });

  // ── Rate limit gate (per-tenant whatsapp_messages cap) ────────────────
  const tenantConfig = (tenant.config ?? {}) as Record<string, unknown>
  const usage = await checkAndTrackUsage(tenantId, tenant.plan, 'whatsapp_messages', 1)
  if (!usage.allowed) {
    console.warn(`[worker] tenant ${tenant.slug} over WhatsApp cap ${usage.current}/${usage.totalLimit}`)
    const limitMsg = `Lo sentimos, este consultorio alcanzó su límite mensual de mensajes. Por favor llame directamente al consultorio para continuar la atención.`
    await sendWhatsAppMessage(from, limitMsg)
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'outbound',
      senderType: 'system',
      content: limitMsg,
    }).catch(() => {})
    return
  }

  // ── Call OpenAI through circuit breaker; fall back to canned reply ────
  const fallbackHint = {
    specialty: typeof tenantConfig.specialty === 'string' ? (tenantConfig.specialty as string) : undefined,
    businessName: tenant.name ?? undefined,
    doctorName: tenantDoctors[0]?.name ?? undefined,
    address: typeof tenantConfig.address === 'string' ? (tenantConfig.address as string) : undefined,
  }

  let answer: string
  let model: string
  let latencyMs: number
  let toolCalls: Array<{ tool: string; success: boolean; error?: string }> = []
  let rounds = 0
  let usedFallback = false

  if (isCircuitOpen()) {
    console.warn(`[worker] OpenAI circuit OPEN — serving canned fallback for tenant=${tenant.slug}`)
    answer = generateFallbackResponse(text, fallbackHint)
    model = 'fallback'
    latencyMs = 0
    usedFallback = true
  } else {
    console.log(`[worker] calling OpenAI (tools) for tenant=${tenant.slug} phone=${redactPhone(normalized)}`)
    try {
      // Per-job ALS frame — guarantees this tenant's doctor context can't
      // leak into a sibling worker job processing a different tenant.
      const toolResult = await runWithDoctorContext(doctorCtx, () =>
        runWhatsAppReplyWithTools({
          tenant,
          systemPrompt: systemPromptOverride,
          messageHistory: history.map((m) => ({
            role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
            content: m.content,
          })),
          incomingMessage: text,
        }),
      )
      answer = toolResult.answer
      model = toolResult.model
      latencyMs = toolResult.latencyMs
      toolCalls = toolResult.toolCalls
      rounds = toolResult.rounds
      recordSuccess()

      // Meter AI tokens against the tenant plan. Pre-2026-05-10 nothing
      // ever incremented `tenant_usage.ai_tokens` so OpenAI cost was
      // unbounded per-tenant. This call is non-blocking (we don't gate
      // the reply on quota) — the worker still answers, but quota
      // exceeded gets logged and surfaced in the dashboard so the
      // operator can act before the next billing window.
      if (toolResult.totalTokens > 0) {
        try {
          const tokenCheck = await checkAndTrackUsage(
            tenantId,
            tenant.plan,
            'ai_tokens',
            toolResult.totalTokens,
          )
          if (!tokenCheck.allowed) {
            console.warn(
              `[worker] tenant ${tenant.slug} over ai_tokens cap ${tokenCheck.current}/${tokenCheck.totalLimit} (this turn: ${toolResult.totalTokens})`,
            )
          }
        } catch (err) {
          console.warn('[worker] ai_tokens metering failed (non-fatal):', err instanceof Error ? err.message : err)
        }
      }
    } catch (err) {
      recordFailure(err)
      console.error(`[worker] OpenAI failed for tenant=${tenant.slug}, using fallback:`, err instanceof Error ? err.message : err)
      answer = generateFallbackResponse(text, fallbackHint)
      model = 'fallback-after-error'
      latencyMs = 0
      usedFallback = true
    }
  }

  console.log(`[worker] reply ready in ${latencyMs}ms model=${model} rounds=${rounds} toolCalls=${toolCalls.length}${usedFallback ? ' (FALLBACK)' : ''}`);
  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      console.log(`[worker]   - ${tc.tool} success=${tc.success}${tc.error ? ` error=${tc.error}` : ''}`);
    }
  }

  // Save outbound message
  await db.insert(messages).values({
    conversationId: conversation.id,
    direction: 'outbound',
    senderType: 'bot',
    content: answer,
  });

  // Update conversation
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  // Create notification (in-app bell)
  await db.insert(notifications).values({
    tenantId,
    type: 'new_message',
    title: 'Nuevo mensaje WhatsApp',
    message: `${from}: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`,
  }).catch((err) => { console.error('Notification insert failed:', err) });

  // Mobile push (best-effort, never blocks worker)
  void (async () => {
    try {
      const { notifyDoctorDevices } = await import('../apps/medconcierge/src/lib/notify-doctor')
      await notifyDoctorDevices(tenantId, {
        title: 'Nuevo mensaje WhatsApp',
        body: `${from}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
        url: `/conversaciones?cid=${conversation.id}`,
        data: { screen: 'conversation', conversationId: conversation.id, tag: `conv-${conversation.id}` },
      })
    } catch (err) {
      console.warn('[worker] push notify failed (non-fatal):', err instanceof Error ? err.message : err)
    }
  })()

  // Send via WhatsApp (H-6: use per-tenant phone_number_id)
  const perTenantPhoneId = await getPhoneNumberIdForTenant(tenantId);
  let sent = false;
  if (perTenantPhoneId) {
    const token = process.env.WHATSAPP_TOKEN;
    if (token) {
      try {
        const res = await fetch(`${WHATSAPP_API_URL}/${perTenantPhoneId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: normalizePhone(from), type: 'text', text: { body: answer } }),
        });
        sent = res.ok;
        if (!sent) console.error('[worker] WhatsApp API error:', await res.text());
      } catch (err) { console.error('[worker] WhatsApp send error:', err); }
    }
  } else {
    sent = await sendWhatsAppMessage(from, answer);
  }
  if (!sent) {
    console.error(`[worker] failed to send WhatsApp to ${from}`);
  }
}

// --------------- Start worker ---------------

console.log('[worker] Starting WhatsApp message worker...');

// IMPORTANT: queue name must match the one used by the webhook (packages/events/index.ts).
// Using MESSAGE_QUEUE_NAME from @quote-engine/events (underscore convention).
// Concurrency comes from env so PM2 can tune it per environment without a
// code change. Default 2 matches the pre-2026-05-11 behaviour for local
// dev; production sets 4 via ecosystem.config.js + 2 PM2 instances = 8
// total lanes.
const WORKER_CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2))
const worker = createWorker('whatsapp_messages', processWhatsAppMessage, WORKER_CONCURRENCY);
console.log(`[worker] starting with concurrency=${WORKER_CONCURRENCY}`);

worker.on('completed', (job) => {
  processedJobCount++;
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});
// M-10: Periodically clean failed BullMQ jobs (older than 24h)
const cleanupQueue = createQueue('whatsapp_messages');
setInterval(async () => {
  try {
    const failedJobs = await cleanupQueue.getFailed(0, 100);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let cleaned = 0;
    for (const job of failedJobs) {
      if (job.timestamp < oneDayAgo) {
        await job.remove();
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[worker] Cleaned ${cleaned} failed BullMQ jobs older than 24h`);
    }
  } catch (err) {
    console.error('[worker] Failed to clean BullMQ jobs:', err);
  }
}, 60 * 60 * 1000); // Run every hour


// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM received, shutting down...');
  await worker.close();
  await closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[worker] SIGINT received, shutting down...');
  await worker.close();
  await closeAll();
  process.exit(0);
});


// L-4: Worker heartbeat logging
let processedJobCount = 0;
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(JSON.stringify({
    type: 'heartbeat',
    uptime: Math.floor(process.uptime()),
    rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
    heap: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
    processed: processedJobCount,
    timestamp: new Date().toISOString(),
  }));
}, 5 * 60 * 1000); // every 5 minutes

console.log('[worker] Ready, waiting for jobs on queue: whatsapp_messages');
