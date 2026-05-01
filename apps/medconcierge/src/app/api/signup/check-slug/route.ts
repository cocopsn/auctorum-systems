export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, tenants } from '@quote-engine/db'

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')

    if (!slug || slug.length < 3) {
      return NextResponse.json({ available: false, error: 'Slug muy corto (min 3 caracteres)' })
    }

    // Validate slug format: only lowercase alphanumeric and hyphens
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({
        available: false,
        error: 'Formato invalido: solo letras minusculas, numeros y guiones',
      })
    }

    const [existing] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)

    if (existing) {
      const suffix = Math.floor(Math.random() * 900) + 100
      const suggestion = slug + '-' + suffix
      return NextResponse.json({ available: false, suggestion })
    }

    return NextResponse.json({ available: true })
  } catch (err) {
    console.error('[check-slug] Error:', err)
    return NextResponse.json(
      { available: false, error: 'Error al verificar disponibilidad' },
      { status: 500 },
    )
  }
}
