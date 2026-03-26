export const dynamic = "force-dynamic";

import { AppointmentsTable } from '@/components/dashboard/appointments-table'

export default function CitasPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
        <p className="text-sm text-gray-500">Gestione todas las citas del consultorio.</p>
      </div>
      <AppointmentsTable />
    </div>
  )
}
