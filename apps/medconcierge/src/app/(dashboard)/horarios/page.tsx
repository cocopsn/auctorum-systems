export const dynamic = "force-dynamic";

import { ScheduleEditor } from '@/components/dashboard/schedule-editor'

export default function HorariosPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
        <p className="text-sm text-gray-500">Configure los días y horarios de consulta.</p>
      </div>
      <ScheduleEditor />
    </div>
  )
}
