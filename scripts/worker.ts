/**
 * BullMQ Worker — processes WhatsApp AI messages off the main thread.
 *
 * Usage: npx tsx scripts/worker.ts
 * PM2:   pm2 start npx --name auctorum-worker -- tsx scripts/worker.ts
 */

// Use relative imports since scripts/ is at repo root and pnpm strict mode
// does not hoist workspace packages to root node_modules.
import { createWorker, closeAll, type Job, type AuctorumJobPayload } from '../packages/queue/src/index';
import {
  db,
  conversations,
  messages,
  clients,
  tenants,
  patients,
  notifications,
  type Tenant,
} from '../packages/db/index';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import {
  getAiSettings,
  runWhatsAppReply,
  searchKnowledgeBase,
  buildTenantSystemPrompt,
  checkTenantBudget,
} from '../packages/ai/index';

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

// --------------- Tenant resolution ---------------

async function resolveTenant(normalized: string): Promise<{ tenant: Tenant; tenantId: string } | null> {
  const [matchedPatient] = await db
    .select({ tenantId: patients.tenantId })
    .from(patients)
    .where(sql`REGEXP_REPLACE(${patients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`)
    .limit(1);

  let tenantId: string;
  if (matchedPatient) {
    tenantId = matchedPatient.tenantId;
  } else {
    const [medTenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.isActive, true), isNull(tenants.deletedAt), sql`(${tenants.config}::jsonb)->'medical' IS NOT NULL`))
      .limit(1);
    if (!medTenant) return null;
    tenantId = medTenant.id;
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return null;
  return { tenant, tenantId };
}

// --------------- Conversation helpers ---------------

async function getOrCreateConversation(tenantId: string, phone: string, normalized: string) {
  let [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.tenantId, tenantId), sql`REGEXP_REPLACE(${clients.phone}, '[^0-9]', '', 'g') LIKE ${'%' + normalized}`))
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
  const systemPromptOverride = buildTenantSystemPrompt({
    tenant,
    ragChunks: ragChunks.map((c) => c.content),
    customInstructions: settings.systemPrompt, // append tenant-custom system prompt as-is
  });

  // Call OpenAI
  console.log(`[worker] calling OpenAI for tenant=${tenant.slug} phone=${normalized}`);
  const { answer, model, latencyMs } = await runWhatsAppReply({
    tenant,
    messageHistory: history,
    incomingMessage: text,
    systemPromptOverride,
  });
  console.log(`[worker] OpenAI responded in ${latencyMs}ms model=${model}`);

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

  // Create notification
  await db.insert(notifications).values({
    tenantId,
    type: 'new_message',
    title: 'Nuevo mensaje WhatsApp',
    message: `${from}: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`,
  }).catch(() => {});

  // Send via WhatsApp
  const sent = await sendWhatsAppMessage(from, answer);
  if (!sent) {
    console.error(`[worker] failed to send WhatsApp to ${from}`);
  }
}

// --------------- Start worker ---------------

console.log('[worker] Starting WhatsApp message worker...');

// IMPORTANT: queue name must match the one used by the webhook (packages/events/index.ts).
// Webhook uses MESSAGE_QUEUE_NAME = 'whatsapp_messages' (underscore).
const worker = createWorker('whatsapp_messages', processWhatsAppMessage, 2);

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

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

console.log('[worker] Ready, waiting for jobs on queue: whatsapp_messages');
