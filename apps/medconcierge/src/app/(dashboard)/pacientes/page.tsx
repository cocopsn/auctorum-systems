export const dynamic = "force-dynamic";

import { PatientsTable } from '@/components/dashboard/patients-table'

export default function PacientesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <p className="text-sm text-gray-500">Directorio de pacientes y su historial.</p>
      </div>
      <PatientsTable />
    </div>
  )
}
