export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAuthTenant } from '@/lib/auth'
import { db } from '@quote-engine/db'
import { sql } from 'drizzle-orm'

/* ------------------------------------------------------------------ */
/*  Dashboard overview — server component                              */
/* ------------------------------------------------------------------ */

export default async function DashboardPage() {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')

  const { tenant } = auth
  const doctorName = tenant.name
  const today = new Date().toISOString().split('T')[0]

  /* --- Query metrics in parallel ---------------------------------- */

  const [todayApptsResult, totalPatientsResult, todayListResult, monthRevenueResult] =
    await Promise.all([
      /* Today's appointments count */
      db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM appointments
        WHERE tenant_id = ${tenant.id}::uuid
          AND date = ${today}
      `),

      /* Total patients */
      db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM patients
        WHERE tenant_id = ${tenant.id}::uuid
      `),

      /* Next 5 appointments today */
      db.execute(sql`
        SELECT
          a.start_time,
          a.status,
          p.name AS patient_name,
          a.reason
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        WHERE a.tenant_id = ${tenant.id}::uuid
          AND a.date = ${today}
        ORDER BY a.start_time ASC
        LIMIT 5
      `),

      /* Revenue this month (completed payments) */
      db.execute(sql`
        SELECT COALESCE(SUM(amount::numeric), 0)::int AS total
        FROM payments
        WHERE tenant_id = ${tenant.id}::uuid
          AND status = 'completed'
          AND created_at >= date_trunc('month', CURRENT_DATE)
      `),
    ])

  const todayAppts = (todayApptsResult as any[])[0]?.count ?? 0
  const totalPatients = (totalPatientsResult as any[])[0]?.count ?? 0
  const todayList = (todayListResult ?? []) as {
    start_time: string
    status: string
    patient_name: string | null
    reason: string | null
  }[]
  const monthRevenue = (monthRevenueResult as any[])[0]?.total ?? 0

  /* --- Greeting based on time of day ------------------------------ */

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  /* --- Render ----------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {greeting}, {doctorName}
        </h1>
        <p className="text-[var(--text-tertiary)] text-sm">
          Aqui esta el resumen de su consultorio
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Citas hoy" value={todayAppts} />
        <MetricCard label="Pacientes total" value={totalPatients} />
        <MetricCard label="Confirmacion" value={'\u2014'} />
        <MetricCard
          label="Ingresos del mes"
          value={`$${Number(monthRevenue).toLocaleString('es-MX')}`}
        />
      </div>

      {/* Today's appointments */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Proximas citas (hoy)
        </h2>
        {todayList.length === 0 ? (
          <p className="text-[var(--text-tertiary)] text-sm">
            No hay citas programadas para hoy
          </p>
        ) : (
          <div className="space-y-3">
            {todayList.map((appt, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <span className="text-sm font-medium text-[var(--text-primary)] w-16">
                  {appt.start_time?.slice(0, 5)}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {appt.patient_name ?? 'Paciente'}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {'\u2014'} {appt.reason || 'Consulta'}
                </span>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <a
          href="/agenda"
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          Agendar cita
        </a>
        <a
          href="/pacientes"
          className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 text-[var(--text-primary)]"
        >
          Ver pacientes
        </a>
        <a
          href="/settings/bot"
          className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 text-[var(--text-primary)]"
        >
          Configurar bot
        </a>
        <a
          href="/onboarding"
          className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 text-[var(--text-primary)]"
        >
          Configuracion inicial
        </a>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Sub-components (server)                                            */
/* ================================================================== */

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Programada' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmada' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completada' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
    no_show: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'No asistio' },
  }

  const s = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status }

  return (
    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
