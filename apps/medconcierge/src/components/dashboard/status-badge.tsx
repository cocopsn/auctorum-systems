const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Agendada', className: 'text-[var(--accent)] bg-[var(--accent-muted)]' },
  confirmed: { label: 'Confirmada', className: 'text-[var(--success)] bg-[var(--success)]/10' },
  in_progress: { label: 'En curso', className: 'text-[var(--warning)] bg-[var(--warning)]/10' },
  completed: { label: 'Completada', className: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]' },
  no_show: { label: 'No asistió', className: 'text-[var(--error)] bg-[var(--error)]/10' },
  cancelled: { label: 'Cancelada', className: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]' },
  rescheduled: { label: 'Reagendada', className: 'text-[var(--warning)] bg-[var(--warning)]/10' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
