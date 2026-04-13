export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, count, desc, eq } from 'drizzle-orm';
import { db, campaigns } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  templateId: z.string().max(255).optional().nullable(),
  audienceFilter: z.record(z.unknown()).default({}),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const filters = [eq(campaigns.tenantId, auth.tenant.id)];
    if (status) filters.push(eq(campaigns.status, status));
    const where = and(...filters);

    const [{ count: total = 0 } = { count: 0 }] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(where);

    const rows = await db
      .select()
      .from(campaigns)
      .where(where)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);
    return apiSuccess({
      rows,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });


  } catch (error) {
    console.error('/api/campaigns GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

    const [created] = await db
      .insert(campaigns)
      .values({
        tenantId: auth.tenant.id,
        name: parsed.data.name,
        templateId: parsed.data.templateId ?? null,
        audienceFilter: parsed.data.audienceFilter,
        status: parsed.data.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        createdBy: auth.user.id,
      })
      .returning();

    return apiSuccess(created, 201);


  } catch (error) {
    console.error('/api/campaigns POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
