export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db, botFaqs } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const createSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(8000),
  priority: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get('active') === 'true';

  const filters = [eq(botFaqs.tenantId, auth.tenant.id)];
  if (onlyActive) filters.push(eq(botFaqs.active, true));

  const rows = await db
    .select()
    .from(botFaqs)
    .where(and(...filters))
    .orderBy(desc(botFaqs.priority), asc(botFaqs.createdAt));

  return apiSuccess(rows);
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const [created] = await db
    .insert(botFaqs)
    .values({
      tenantId: auth.tenant.id,
      question: parsed.data.question,
      answer: parsed.data.answer,
      priority: parsed.data.priority,
      active: parsed.data.active,
    })
    .returning();

  return apiSuccess(created, 201);
}
