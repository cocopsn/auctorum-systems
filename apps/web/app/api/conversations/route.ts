export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { db, conversations, clients } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  clientId: z.string().uuid().optional(),
  channel: z.string().max(30).default('whatsapp'),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const channel = searchParams.get('channel');
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;

  const filters = [eq(conversations.tenantId, auth.tenant.id)];
  if (status) filters.push(eq(conversations.status, status));
  if (channel) filters.push(eq(conversations.channel, channel));

  const where = and(...filters);
  const [{ count: total = 0 } = { count: 0 }] = await db
    .select({ count: count() })
    .from(conversations)
    .where(where);

  let query = db
    .select({
      id: conversations.id,
      clientId: conversations.clientId,
      channel: conversations.channel,
      status: conversations.status,
      assignedTo: conversations.assignedTo,
      botPaused: conversations.botPaused,
      lastMessageAt: conversations.lastMessageAt,
      unreadCount: conversations.unreadCount,
      createdAt: conversations.createdAt,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
    .from(conversations)
    .leftJoin(clients, eq(conversations.clientId, clients.id))
    .where(where)
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt))
    .limit(limit)
    .offset(offset);

  let rows = await query;
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.clientName ?? '').toLowerCase().includes(s) ||
        (r.clientPhone ?? '').toLowerCase().includes(s),
    );
  }

  const totalPages = Math.ceil(total / limit);
  return apiSuccess({
    rows,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  });
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const [created] = await db
    .insert(conversations)
    .values({
      tenantId: auth.tenant.id,
      clientId: parsed.data.clientId ?? null,
      channel: parsed.data.channel,
    })
    .returning();

  logger.info('conversation.created', { tenantId: auth.tenant.id, action: 'create_conversation' });
  return apiSuccess(created, 201);
}
