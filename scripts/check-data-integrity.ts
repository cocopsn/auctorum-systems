/**
 * Data integrity audit — runs real SQL against the production database and
 * fails (exit code 1) if any structural invariant is violated. Designed to
 * run:
 *
 *   - on demand:    `pnpm test:integrity`
 *   - daily cron:   add a PM2 entry with `cron_restart: '0 6 * * *'`
 *
 * Each check is a single SELECT that asserts a count = 0 (anti-corruption
 * pattern). Any non-zero result is a real bug we want to know about
 * within 24h.
 *
 * Output is JSON one line per check + a final summary line, suitable for
 * grep / Loki / Datadog ingestion.
 */
import 'dotenv/config'
import { createRequire } from 'node:module'

// dotenv preflight: prefer apps/medconcierge/.env.local if available — same
// values the worker uses, ensures tests target the same DB.
const require_ = createRequire(import.meta.url)
try {
  require_('dotenv').config({ path: 'apps/medconcierge/.env.local' })
} catch {
  /* falls back to process env */
}

import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  console.error('[integrity] DATABASE_URL is not set')
  process.exit(2)
}

const sql = postgres(process.env.DATABASE_URL, { max: 2, connect_timeout: 10 })

type Check = {
  name: string
  description: string
  query: string
  // True positive = invariant is HOLDING (count is 0).
  // We only fail if the count is non-zero AND severity allows.
  severity: 'fatal' | 'warn'
}

const CHECKS: Check[] = [
  // ─── tenant_id consistency ─────────────────────────────────────────────
  {
    name: 'patients.no_null_tenant',
    description: 'No patient row may exist without a tenant_id',
    query: 'SELECT COUNT(*)::int AS n FROM patients WHERE tenant_id IS NULL',
    severity: 'fatal',
  },
  {
    name: 'appointments.no_null_tenant',
    description: 'No appointment row may exist without a tenant_id',
    query: 'SELECT COUNT(*)::int AS n FROM appointments WHERE tenant_id IS NULL',
    severity: 'fatal',
  },
  {
    name: 'patient_payments.no_null_tenant',
    description: 'No patient payment row may exist without a tenant_id',
    query: "SELECT COUNT(*)::int AS n FROM patient_payments WHERE tenant_id IS NULL",
    severity: 'fatal',
  },

  // ─── Cross-tenant foreign-key integrity ────────────────────────────────
  {
    name: 'appointments.same_tenant_as_patient',
    description: 'appointments.tenant_id must match patients.tenant_id for that patient_id',
    query: `
      SELECT COUNT(*)::int AS n
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.tenant_id <> p.tenant_id
    `,
    severity: 'fatal',
  },
  {
    name: 'clinical_records.same_tenant_as_patient',
    description: 'clinical_records.tenant_id must match patients.tenant_id',
    query: `
      SELECT COUNT(*)::int AS n
      FROM clinical_records cr
      JOIN patients p ON p.id = cr.patient_id
      WHERE cr.tenant_id <> p.tenant_id
    `,
    severity: 'fatal',
  },
  {
    name: 'patient_payments.same_tenant_as_patient',
    description: 'patient_payments.tenant_id must match patients.tenant_id',
    query: `
      SELECT COUNT(*)::int AS n
      FROM patient_payments pp
      JOIN patients p ON p.id = pp.patient_id
      WHERE pp.tenant_id <> p.tenant_id
    `,
    severity: 'fatal',
  },

  // ─── Orphans ──────────────────────────────────────────────────────────
  {
    name: 'campaign_messages.no_orphans',
    description: 'No campaign_messages may reference a non-existent campaign',
    query: `
      SELECT COUNT(*)::int AS n
      FROM campaign_messages cm
      LEFT JOIN campaigns c ON c.id = cm.campaign_id
      WHERE c.id IS NULL
    `,
    severity: 'warn',
  },
  {
    name: 'messages.no_orphans',
    description: 'No messages may reference a non-existent conversation',
    query: `
      SELECT COUNT(*)::int AS n
      FROM messages m
      LEFT JOIN conversations c ON c.id = m.conversation_id
      WHERE c.id IS NULL
    `,
    severity: 'warn',
  },
  {
    name: 'appointment_events.no_orphans',
    description: 'No appointment_events may reference a non-existent appointment',
    query: `
      SELECT COUNT(*)::int AS n
      FROM appointment_events ae
      LEFT JOIN appointments a ON a.id = ae.appointment_id
      WHERE a.id IS NULL
    `,
    severity: 'warn',
  },

  // ─── NOM-004 compliance ────────────────────────────────────────────────
  {
    name: 'clinical_records.locked_have_cedula',
    description: 'Every locked clinical record must carry the doctor cedula snapshot',
    query: `
      SELECT COUNT(*)::int AS n
      FROM clinical_records
      WHERE is_locked = true
        AND (doctor_cedula IS NULL OR doctor_cedula = '')
    `,
    severity: 'fatal',
  },

  // ─── Unique business rules ────────────────────────────────────────────
  {
    name: 'patients.no_duplicate_phone_per_tenant',
    description: 'Tenant + phone must be globally unique across patients',
    query: `
      SELECT COUNT(*)::int AS n FROM (
        SELECT tenant_id, phone, COUNT(*) c
        FROM patients
        WHERE phone IS NOT NULL AND phone <> ''
        GROUP BY tenant_id, phone
        HAVING COUNT(*) > 1
      ) dupes
    `,
    severity: 'fatal',
  },
  {
    name: 'tenants.unique_slug',
    description: 'Tenant slugs must be unique',
    query: `
      SELECT COUNT(*)::int AS n FROM (
        SELECT slug, COUNT(*) c FROM tenants GROUP BY slug HAVING COUNT(*) > 1
      ) dupes
    `,
    severity: 'fatal',
  },

  // ─── Settings + integrations ──────────────────────────────────────────
  {
    name: 'integrations.unique_per_tenant_type',
    description: '(tenant_id, type) must be unique on integrations',
    query: `
      SELECT COUNT(*)::int AS n FROM (
        SELECT tenant_id, type, COUNT(*) c
        FROM integrations
        GROUP BY tenant_id, type
        HAVING COUNT(*) > 1
      ) dupes
    `,
    severity: 'fatal',
  },

  // ─── Lead Ads ────────────────────────────────────────────────────────
  {
    name: 'ad_leads.no_orphan_appointment_id',
    description: 'ad_leads.appointment_id must reference a real appointment when set',
    query: `
      SELECT COUNT(*)::int AS n
      FROM ad_leads al
      LEFT JOIN appointments a ON a.id = al.appointment_id
      WHERE al.appointment_id IS NOT NULL AND a.id IS NULL
    `,
    severity: 'warn',
  },

  // ─── Documents ───────────────────────────────────────────────────────
  {
    name: 'documents.no_orphan_patient_id',
    description: 'documents.patient_id must reference a real patient when set',
    query: `
      SELECT COUNT(*)::int AS n
      FROM documents d
      LEFT JOIN patients p ON p.id = d.patient_id
      WHERE d.patient_id IS NOT NULL AND p.id IS NULL
    `,
    severity: 'warn',
  },

  // ─── Push subscriptions ─────────────────────────────────────────────
  {
    name: 'web_push_subscriptions.no_orphan_user',
    description: 'web_push_subscriptions.user_id must reference a real user',
    query: `
      SELECT COUNT(*)::int AS n
      FROM web_push_subscriptions wps
      LEFT JOIN users u ON u.id = wps.user_id
      WHERE u.id IS NULL
    `,
    severity: 'warn',
  },
]

type Result = Check & {
  count: number
  ok: boolean
  ms: number
  error?: string
}

async function runChecks(): Promise<Result[]> {
  const results: Result[] = []
  for (const check of CHECKS) {
    const start = Date.now()
    try {
      const rows = (await sql.unsafe(check.query)) as unknown as Array<{ n: number }>
      const count = Number(rows[0]?.n ?? 0)
      results.push({ ...check, count, ok: count === 0, ms: Date.now() - start })
    } catch (err) {
      results.push({
        ...check,
        count: -1,
        ok: false,
        ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return results
}

async function main() {
  const overallStart = Date.now()
  const results = await runChecks()

  for (const r of results) {
    console.log(
      JSON.stringify({
        action: 'integrity_check',
        name: r.name,
        description: r.description,
        ok: r.ok,
        count: r.count,
        severity: r.severity,
        ms: r.ms,
        ...(r.error ? { error: r.error } : {}),
      }),
    )
  }

  const fatalFails = results.filter((r) => !r.ok && r.severity === 'fatal')
  const warnFails = results.filter((r) => !r.ok && r.severity === 'warn')

  console.log(
    JSON.stringify({
      action: 'integrity_summary',
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      warnings: warnFails.length,
      fatal: fatalFails.length,
      ms: Date.now() - overallStart,
      timestamp: new Date().toISOString(),
    }),
  )

  await sql.end()
  process.exit(fatalFails.length > 0 ? 1 : 0)
}

main().catch(async (err) => {
  console.error('[integrity] fatal error:', err)
  await sql.end({ timeout: 1 }).catch(() => {})
  process.exit(2)
})
