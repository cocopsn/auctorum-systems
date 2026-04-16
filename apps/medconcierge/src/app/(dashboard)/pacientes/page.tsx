export const dynamic = "force-dynamic";

import { PatientsTable } from '@/components/dashboard/patients-table'

export default function PacientesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Pacientes</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Directorio de pacientes y su historial.</p>
      </div>
      <PatientsTable />
    </div>
  )
}
