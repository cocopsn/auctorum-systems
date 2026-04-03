export const dynamic = "force-dynamic";

import { AppointmentsTable } from '@/components/dashboard/appointments-table'

export default function CitasPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Citas</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Gestione todas las citas del consultorio.</p>
      </div>
      <AppointmentsTable />
    </div>
  )
}
