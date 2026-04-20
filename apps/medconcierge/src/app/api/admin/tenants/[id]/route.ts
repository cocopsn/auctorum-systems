export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, sql, and, desc } from "drizzle-orm"
import {
  db, tenants, users, subscriptions, appointments, messages,
  conversations, botInstances, payments,
} from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

type RouteCtx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, params.id)).limit(1)
  if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })

  const tenantUsers = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.tenantId, params.id))

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, params.id))
    .limit(1)

  const bots = await db
    .select()
    .from(botInstances)
    .where(eq(botInstances.tenantId, params.id))

  const recentAppointments = await db
    .select({ id: appointments.id, date: appointments.date, startTime: appointments.startTime, status: appointments.status, reason: appointments.reason })
    .from(appointments)
    .where(eq(appointments.tenantId, params.id))
    .orderBy(desc(appointments.createdAt))
    .limit(10)

  const recentMessages = await db
    .select({
      id: messages.id, direction: messages.direction, senderType: messages.senderType,
      content: messages.content, createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.tenantId, params.id))
    .orderBy(desc(messages.createdAt))
    .limit(20)

  const recentPayments = await db
    .select({ id: payments.id, amount: payments.amount, status: payments.status, createdAt: payments.createdAt })
    .from(payments)
    .where(eq(payments.tenantId, params.id))
    .orderBy(desc(payments.createdAt))
    .limit(10)

  return NextResponse.json({
    tenant,
    users: tenantUsers,
    subscription: sub || null,
    botInstances: bots,
    recentAppointments,
    recentMessages,
    recentPayments,
  })
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const allowedFields: Record<string, any> = {}

  if (body.plan !== undefined) allowedFields.plan = body.plan
  if (body.provisioningStatus !== undefined) allowedFields.provisioningStatus = body.provisioningStatus
  if (body.isActive !== undefined) allowedFields.isActive = body.isActive
  if (body.config !== undefined) allowedFields.config = body.config
  if (body.name !== undefined) allowedFields.name = body.name

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
  }

  allowedFields.updatedAt = new Date()

  const [updated] = await db
    .update(tenants)
    .set(allowedFields)
    .where(eq(tenants.id, params.id))
    .returning()

  return NextResponse.json({ tenant: updated })
}
