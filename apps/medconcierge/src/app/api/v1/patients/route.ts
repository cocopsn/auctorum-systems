export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db, patients } from '@quote-engine/db'
import { authenticateApiKey, apiUnauthorized, apiForbidden, apiRateLimit } from '@/lib/api-auth'

// ---------------------------------------------------------------------------
// GET /api/v1/patients
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    if (!auth.permissions.includes('read')) return apiForbidden('read')
    const rl = await apiRateLimit(auth.tenant.id, auth.tenant.plan)
    if (rl) return rl

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
    const perPage = Math.min(100, Math.max(1, parseInt(sp.get('per_page') ?? '20', 10) || 20))
    const search = sp.get('search')?.trim()

    const where = [eq(patients.tenantId, auth.tenant.id)]
    if (search && search.length >= 2) {
      const term = `%${search}%`
      where.push(
        or(
          ilike(patients.name, term),
          ilike(patients.phone, term),
          ilike(patients.email, term),
        )!,
      )
    }

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          id: patients.id,
          name: patients.name,
          phone: patients.phone,
          email: patients.email,
          dateOfBirth: patients.dateOfBirth,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(and(...where))
        .orderBy(desc(patients.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(and(...where)),
    ])

    return NextResponse.json({
      data: rows,
      meta: { total: count, page, per_page: perPage },
    })
  } catch (err) {
    console.error('[GET /api/v1/patients] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/patients
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z
    .string()
    .min(8)
    .max(50)
    .regex(/^[+0-9\-\s()]+$/, 'Phone must be digits and +-() only'),
  email: z.string().email().max(255).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    if (!auth.permissions.includes('write')) return apiForbidden('write')
    const rl = await apiRateLimit(auth.tenant.id, auth.tenant.plan)
    if (rl) return rl

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    // Idempotency: if a patient with this phone already exists in the tenant, return it
    const [existing] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, auth.tenant.id), eq(patients.phone, data.phone)))
      .limit(1)
    if (existing) {
      return NextResponse.json({ data: existing, existing: true }, { status: 200 })
    }

    const [created] = await db
      .insert(patients)
      .values({
        tenantId: auth.tenant.id,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
      })
      .returning()

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/v1/patients] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
