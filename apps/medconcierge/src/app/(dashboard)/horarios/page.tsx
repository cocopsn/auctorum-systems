export const dynamic = "force-dynamic";

import { ScheduleEditor } from '@/components/dashboard/schedule-editor'

export default function HorariosPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Horarios</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Configure los días y horarios de consulta.</p>
      </div>
      <ScheduleEditor />
    </div>
  )
}
