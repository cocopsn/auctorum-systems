export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
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

// ---- Zod schema for PATCH validation ----
const patchTenantSchema = z.object({
  plan: z.enum(["basico", "profesional", "premium", "enterprise"]).optional(),
  provisioningStatus: z.enum(["draft", "pending_plan", "active", "suspended"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(255).optional(),
  config: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string().optional(),
      background: z.string(),
    }).optional(),
    contact: z.object({
      phone: z.string(),
      email: z.string(),
      whatsapp: z.string(),
      address: z.string(),
    }).optional(),
    business: z.object({
      razon_social: z.string(),
      rfc: z.string(),
      giro: z.string(),
    }).optional(),
    account: z.object({
      type: z.enum(["medical", "industrial"]).optional(),
      plan: z.string().optional(),
      portalHost: z.string().optional(),
      publicHost: z.string().optional(),
    }).optional(),
    medical: z.object({
      specialty: z.string(),
      sub_specialty: z.string(),
      cedula_profesional: z.string(),
      cedula_especialidad: z.string(),
      consultation_fee: z.number(),
      consultation_duration_min: z.number(),
      accepts_insurance: z.boolean(),
      insurance_providers: z.array(z.string()),
    }).optional(),
    schedule_settings: z.object({
      timezone: z.string(),
      advance_booking_days: z.number(),
      min_booking_hours_ahead: z.number(),
      cancellation_hours: z.number(),
      auto_confirm: z.boolean(),
      allow_online_payment: z.boolean(),
      show_fee_on_portal: z.boolean(),
    }).optional(),
    notifications: z.record(z.union([z.boolean(), z.number()])).optional(),
    features: z.record(z.boolean()).optional(),
    ai: z.object({
      enabled: z.boolean(),
      systemPrompt: z.string(),
      autoSchedule: z.boolean(),
      answerFaq: z.boolean(),
      humanHandoff: z.boolean(),
      model: z.string(),
      vectorStoreId: z.string().nullable().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    }).optional(),
  }).optional(),
}).strict()

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const parsed = patchTenantSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const allowedFields: Record<string, any> = {}

  if (data.plan !== undefined) allowedFields.plan = data.plan
  if (data.provisioningStatus !== undefined) allowedFields.provisioningStatus = data.provisioningStatus
  if (data.isActive !== undefined) allowedFields.isActive = data.isActive
  if (data.config !== undefined) allowedFields.config = data.config
  if (data.name !== undefined) allowedFields.name = data.name

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
