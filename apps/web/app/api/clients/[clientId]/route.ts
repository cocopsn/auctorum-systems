import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, clients, users } from '@quote-engine/db';
import { eq, and, isNull } from 'drizzle-orm';
import { validateOrigin } from '@/lib/csrf';
import { createSupabaseServer } from '@/lib/supabase-ssr';

// ============================================================
// PATCH /api/clients/[clientId]
// Partial update of CRM fields (notes, status). Mirrors the
// products PUT pattern: validateOrigin CSRF + Supabase session +
// tenant-ownership check + Zod .strict() (rejects unknown fields).
// ============================================================

const updateClientSchema = z
  .object({
    notes: z.string().max(2000, 'Notas demasiado largas').nullable().optional(),
    status: z.enum(['lead', 'customer', 'inactive']).optional(),
  })
  .strict();

type RouteContext = { params: { clientId: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const supabase = createSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { clientId } = params;

    // Ownership check scoped to the authenticated tenant.
    const [existing] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        eq(clients.tenantId, user.tenantId),
        isNull(clients.deletedAt),
      ))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

    const [updated] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PATCH /api/clients/[clientId] error:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}
