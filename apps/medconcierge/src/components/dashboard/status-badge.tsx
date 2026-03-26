const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Agendada', className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En curso', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completada', className: 'bg-gray-100 text-gray-700' },
  no_show: { label: 'No asistió', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500' },
  rescheduled: { label: 'Reagendada', className: 'bg-orange-100 text-orange-700' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
