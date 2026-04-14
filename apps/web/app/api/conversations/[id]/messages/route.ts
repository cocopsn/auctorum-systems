export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import { db, conversations, messages } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';
import { logger } from '@/lib/logger';

const sendSchema = z.object({
  content: z.string().min(1).max(4000),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.string().max(50).optional().nullable(),
});

async function ensureOwned(conversationId: string, tenantId: string) {
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .limit(1);
  return conv ?? null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const conv = await ensureOwned(params.id, auth.tenant.id);
  if (!conv) return apiError(404, 'Conversation not found');

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.id))
    .orderBy(asc(messages.createdAt));

  return apiSuccess(rows);

  } catch (err) {
    console.error('[GET]', err instanceof Error ? err.message : er
  try {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const conv = await ensureOwned(params.id, auth.tenant.id);
  if (!conv) return apiError(404, 'Conversation not found');

  const body = await request.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const now = new Date();
  const [created] = await db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(messages)
      .values({
        conversationId: params.id,
        direction: 'outbound',
        senderType: 'manual',
        content: parsed.data.content,
        mediaUrl: parsed.data.mediaUrl ?? null,
        mediaType: parsed.data.mediaType ?? null,
      })
      .returning();
    await tx
      .update(conversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(conversations.id, params.id));
    return [msg];
  });

  logger.info('message.queued', { tenantId: auth.tenant.id, action: 'send_message' });
  // NOTE: actual WhatsApp send pipeline lives in Checkpoint 5. Here we only persist.
  return apiSuccess(created, 201);

  } catch (err) {
    console.error('[POST]', err instanceof Error ? err.message : err);
    return apiError(500, 'Internal server error');
  }
id, action: 'send_message' });
  // NOTE: actual WhatsApp send pipeline lives in Checkpoint 5. Here we only persist.
  return apiSuccess(created, 201);
}
