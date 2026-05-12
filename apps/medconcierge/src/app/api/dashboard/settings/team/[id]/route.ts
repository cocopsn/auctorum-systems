import { NextRequest, NextResponse } from 'next/server'
import { db, users, auditLog } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  // Keep in sync with TENANT_ROLES in `../route.ts`.
  role: z.enum(['admin', 'secretaria', 'operator', 'viewer']).optional(),
}).strict()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(request)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede modificar roles' }, { status: 403 })
    }

    const memberId = params.id
    if (memberId === auth.user.id) {
      return NextResponse.json({ error: 'No puedes modificar tu propio rol' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Verify member belongs to same tenant
    const [member] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, memberId), eq(users.tenantId, auth.tenant.id)))
      .limit(1)

    if (!member) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (parsed.data.role) updates.role = parsed.data.role

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, memberId))

      // Audit role changes specifically. Pre-2026-05-12 these were
      // unaudited so a malicious admin could promote/demote silently.
      if (parsed.data.role && parsed.data.role !== member.role) {
        await auditLog({
          tenantId: auth.tenant.id,
          userId: auth.user.id,
          action: 'team.role_change',
          entity: `user:${memberId}`,
          before: { role: member.role },
          after: { role: parsed.data.role },
          ip: request.headers.get('x-forwarded-for') ?? null,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Team PATCH error:', err)
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

    if (auth.user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede eliminar miembros' }, { status: 403 })
    }

    const memberId = params.id
    if (memberId === auth.user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    const [member] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, memberId), eq(users.tenantId, auth.tenant.id)))
      .limit(1)

    if (!member) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    // Soft-delete instead of hard DELETE. Pre-2026-05-10 the row was
    // dropped, breaking FKs in audit_logs.user_id and
    // appointment_events.created_by — the action history of that user
    // disappeared. Now we deactivate so the audit trail stays intact and
    // /dashboard/settings/team filters by isActive=true.
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, memberId))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Team DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
