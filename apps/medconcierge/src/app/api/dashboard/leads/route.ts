/**
 * Dashboard endpoint para leads:
 *
 *   GET  /api/dashboard/leads          → lista paginada con filtros + KPIs
 *   POST /api/dashboard/leads          → crear lead manual desde el dashboard
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, desc, ilike, or, sql, gte, lte, count, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db, adLeads, LEAD_SOURCES, LEAD_STATUSES } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { autoContactLead, formatPhoneMX } from '@/lib/lead-autocontact'

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  const sp = req.nextUrl.searchParams
  const source = sp.get('source')
  const status = sp.get('status')
  const search = sp.get('search')?.trim()
  const from = sp.get('from')
  const to = sp.get('to')
  const limit = Math.min(parseInt(sp.get('limit') ?? '50'), 200)
  const offset = parseInt(sp.get('offset') ?? '0')

  try {
    const conditions: SQL[] = [eq(adLeads.tenantId, tenantId)]

    if (source && (LEAD_SOURCES as readonly string[]).includes(source)) {
      conditions.push(eq(adLeads.source, source))
    }
    if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(adLeads.status, status))
    }
    if (from) conditions.push(gte(adLeads.createdAt, new Date(from)))
    if (to) conditions.push(lte(adLeads.createdAt, new Date(to)))
    if (search) {
      const cond = or(
        ilike(adLeads.name, `%${search}%`),
        ilike(adLeads.phone, `%${search}%`),
        ilike(adLeads.email, `%${search}%`),
        ilike(adLeads.campaignName, `%${search}%`),
      )
      if (cond) conditions.push(cond)
    }

    const where = and(...conditions)

    const [items, [{ total }], pipelineRows] = await Promise.all([
      db.select().from(adLeads).where(where).orderBy(desc(adLeads.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(adLeads).where(where),
      db
        .select({
          status: adLeads.status,
          n: count(),
        })
        .from(adLeads)
        .where(eq(adLeads.tenantId, tenantId))
        .groupBy(adLeads.status),
    ])

    // Reduce pipeline counts to a single object keyed by status
    const pipeline: Record<string, number> = Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, 0]),
    )
    for (const row of pipelineRows) {
      pipeline[row.status as string] = Number(row.n) || 0
    }

    const totalActive =
      pipeline.new + pipeline.contacted + pipeline.responded + pipeline.appointed
    const converted = pipeline.converted
    const conversionRate =
      totalActive + converted + pipeline.lost > 0
        ? converted / (totalActive + converted + pipeline.lost)
        : 0

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      pipeline,
      kpis: {
        total: Object.values(pipeline).reduce((a, b) => a + b, 0),
        contacted: pipeline.contacted + pipeline.responded + pipeline.appointed + converted,
        appointed: pipeline.appointed + converted,
        converted,
        conversionRate: Number(conversionRate.toFixed(4)),
      },
    })
  } catch (err: any) {
    console.error('[leads GET] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── POST — crear lead manual ──────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional(),
  source: z.enum(LEAD_SOURCES).default('manual'),
  campaignName: z.string().max(255).optional(),
  autoContact: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const data = parsed.data

  try {
    const [inserted] = await db
      .insert(adLeads)
      .values({
        tenantId: auth.tenant.id,
        source: data.source,
        name: data.name || null,
        phone: data.phone ? formatPhoneMX(data.phone) : null,
        email: data.email || null,
        message: data.message || null,
        campaignName: data.campaignName || null,
        utmSource: data.source,
        utmMedium: data.source === 'manual' ? 'manual' : null,
      })
      .returning()

    let contacted = false
    if (data.autoContact && inserted.phone) {
      const res = await autoContactLead(auth.tenant, inserted)
      contacted = res.ok
    }

    return NextResponse.json({ lead: inserted, contacted })
  } catch (err: any) {
    console.error('[leads POST] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
