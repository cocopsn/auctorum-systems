import { NextRequest, NextResponse } from 'next/server'
import { db, followUps } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const patchSchema = z.object({
      status: z.enum(['pending', 'sent', 'completed', 'cancelled']).optional(),
      scheduledAt: z.string().datetime().optional(),
      messageTemplate: z.string().max(2000).optional(),
    });
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updates: Record<string, any> = {}

    if (parsed.data.status) updates.status = parsed.data.status
    if (parsed.data.scheduledAt) updates.scheduledAt = new Date(parsed.data.scheduledAt)
    if (parsed.data.messageTemplate !== undefined) updates.messageTemplate = parsed.data.messageTemplate

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios' }, { status: 400 })
    }

    const [updated] = await db
      .update(followUps)
      .set(updates)
      .where(and(eq(followUps.id, params.id), eq(followUps.tenantId, auth.tenant.id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json({ followUp: updated })
  } catch (err: any) {
    console.error('Follow-up PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    await db
      .delete(followUps)
      .where(and(eq(followUps.id, params.id), eq(followUps.tenantId, auth.tenant.id)))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Follow-up DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
