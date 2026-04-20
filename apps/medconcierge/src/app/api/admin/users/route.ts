export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { sql, eq, desc } from "drizzle-orm"
import { db, users, tenants } from "@quote-engine/db"
import { requireRole } from "@/lib/auth"

export async function GET() {
  const auth = await requireRole(["super_admin"])
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      tenantId: users.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(users)
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .orderBy(desc(users.createdAt))

  return NextResponse.json({ users: allUsers })
}
