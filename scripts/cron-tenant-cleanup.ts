/**
 * cron-tenant-cleanup
 *
 * Sweeps tenants stuck in 'unverified' or 'pending_plan' for more than
 * STALE_DAYS days and soft-deletes the workspace.
 *
 *   - 'unverified': user signed up but never confirmed email
 *   - 'pending_plan': user verified email but never completed Stripe Checkout
 *
 * Pre-2026-05-11 the web /api/signup route bypassed payment entirely and
 * left tenants in 'active' status without any subscription. Post-fix the
 * row stays in 'unverified' / 'pending_plan' indefinitely if the user
 * abandons signup — those rows squat the slug forever, block real users,
 * and pollute analytics. This cron is the janitor.
 *
 * Actions taken per stale tenant:
 *   1. Soft-delete the tenant (deletedAt = now, isActive = false,
 *      provisioningStatus = 'cancelled')
 *   2. Free the slug by suffixing '-deleted-<short_id>' so a real user
 *      can re-claim it later
 *   3. Delete the orphan supabase auth.users row(s) for that tenant
 *      (no payment, no PHI, safe to hard-delete the auth identity)
 *   4. Mark child user rows isActive=false (no FK cascade — soft only,
 *      the tenant_id stays for audit)
 *
 * Cadence: daily at 5am (PM2 cron_restart `0 5 * * *`, America/Monterrey).
 *
 * Boundary: only touches `unverified` and `pending_plan`. Never touches
 * `active`, `suspended`, or `cancelled` — those are managed by the
 * subscription webhooks / explicit admin action.
 */

import 'dotenv/config'
import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db, tenants, users } from '@quote-engine/db'
import { createClient } from '@supabase/supabase-js'

const STALE_DAYS = Number(process.env.TENANT_STALE_DAYS ?? '14')
const BATCH = 50

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function main() {
  const start = Date.now()
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
  console.log(`[tenant-cleanup] starting at ${new Date().toISOString()} cutoff=${cutoff.toISOString()} (>${STALE_DAYS}d)`)

  const stale = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      provisioningStatus: tenants.provisioningStatus,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .where(
      and(
        inArray(tenants.provisioningStatus, ['unverified', 'pending_plan']),
        lte(tenants.createdAt, cutoff),
        isNull(tenants.deletedAt),
      ),
    )
    .limit(BATCH)

  if (stale.length === 0) {
    console.log(JSON.stringify({ action: 'tenant_cleanup_cycle', stale: 0, deleted: 0, errors: 0, window_ms: Date.now() - start }))
    return
  }

  console.log(`[tenant-cleanup] found ${stale.length} stale tenants`)
  const admin = supabaseAdmin()

  let deleted = 0
  let errors = 0

  for (const t of stale) {
    try {
      // 1. Find all users that belong to this tenant (for auth.users cleanup).
      const tenantUsers = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.tenantId, t.id))

      // 2. Soft-delete the tenant. Mangle the slug so the user can come
      //    back later with the same email and re-claim the original.
      const newSlug = `${t.slug}-deleted-${t.id.slice(0, 8)}`.slice(0, 63)
      await db
        .update(tenants)
        .set({
          provisioningStatus: 'cancelled',
          isActive: false,
          deletedAt: new Date(),
          slug: newSlug,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, t.id))

      // 3. Soft-deactivate users (do NOT delete the row — audit retention).
      if (tenantUsers.length > 0) {
        await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.tenantId, t.id))
      }

      // 4. Hard-delete the auth.users identity in Supabase (no payment,
      //    no PHI ever entered — safe). Best-effort: log failures, don't
      //    break the cycle.
      let authDeleted = 0
      for (const u of tenantUsers) {
        try {
          const { error } = await admin.auth.admin.deleteUser(u.id)
          if (error) {
            // 404 (user already gone) is fine — count as success.
            if (!/not.*found/i.test(error.message)) {
              console.warn(`[tenant-cleanup] auth.deleteUser ${u.id} (${u.email}) failed: ${error.message}`)
            } else {
              authDeleted++
            }
          } else {
            authDeleted++
          }
        } catch (err) {
          console.warn(`[tenant-cleanup] auth.deleteUser ${u.id} threw:`, err)
        }
      }

      deleted++
      console.log(
        `[tenant-cleanup] OK tenant=${t.id} slug=${t.slug}→${newSlug} status=${t.provisioningStatus} users=${tenantUsers.length} auth_deleted=${authDeleted}`,
      )
    } catch (err) {
      errors++
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[tenant-cleanup] ERROR tenant=${t.id} slug=${t.slug}: ${message}`)
    }
  }

  const ms = Date.now() - start
  console.log(
    JSON.stringify({
      action: 'tenant_cleanup_cycle',
      stale: stale.length,
      deleted,
      errors,
      window_ms: ms,
      cutoff_days: STALE_DAYS,
      timestamp: new Date().toISOString(),
    }),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[cron-tenant-cleanup] fatal', err)
    process.exit(1)
  })
