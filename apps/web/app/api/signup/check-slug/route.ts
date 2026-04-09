export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'
import { validateSlug } from '@/lib/slug'

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim().toLowerCase()

  const validationError = validateSlug(slug)
  if (validationError) {
    return NextResponse.json({ available: false, error: validationError })
  }

  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)

  if (existing) {
    return NextResponse.json({ available: false, error: 'Ya está en uso' })
  }

  return NextResponse.json({ available: true })
}
