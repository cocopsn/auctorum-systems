export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, tenants, type PublicSubdomainPrefix, type TenantType } from '@quote-engine/db'
import { validateSlug } from '@/lib/slug'
import { buildPublicSubdomain, getTenantSlugForSignup } from '@/lib/signup'

export async function GET(req: NextRequest) {
  try {
    const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim().toLowerCase()
    const tenantType = ((req.nextUrl.searchParams.get('tenantType') ?? 'industrial').trim().toLowerCase() as TenantType)
    const prefix = ((req.nextUrl.searchParams.get('prefix') ?? '').trim().toLowerCase() as PublicSubdomainPrefix)

    const validationError = validateSlug(slug)
    if (validationError) {
      return NextResponse.json({ available: false, error: validationError })
    }

    const candidateSlug = getTenantSlugForSignup({
      tenantType,
      slug,
      publicSubdomainPrefix: tenantType === 'medical' ? prefix : undefined,
    })

    const [existing] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, candidateSlug))
      .limit(1)

    if (existing) {
      return NextResponse.json({ available: false, error: 'Ya esta en uso' })
    }

    return NextResponse.json({
      available: true,
      tenantSlug: candidateSlug,
      publicSubdomain: tenantType === 'medical' && prefix ? buildPublicSubdomain(prefix, slug) : null,
    })
  } catch (error) {
    console.error('/api/signup/check-slug GET error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
