import { NextRequest, NextResponse } from 'next/server'
import { db, conversations, clients } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
 params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.tenantId, auth.tenant.id)
        )
      )
      .limit(1)

    if (!conv) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.botPaused !== undefined) updates.botPaused = body.botPaused

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date()
      await db
        .update(conversations)
        .set(updates)
        .where(eq(conversations.id, params.id))
    }

    // Optional: rename the underlying client (WhatsApp contact name)
    if (typeof body.clientName === 'string' && body.clientName.trim() && conv.clientId) {
      const name = body.clientName.trim().slice(0, 255)
      await db
        .update(clients)
        .set({ name, updatedAt: new Date() })
        .where(and(eq(clients.id, conv.clientId), eq(clients.tenantId, auth.tenant.id)))
    }

    const [updated] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, params.id))
      .limit(1)

    return NextResponse.json({ conversation: updated })
  } catch (err: any) {
    console.error('conversation patch error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
