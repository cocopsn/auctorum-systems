export function PortalHeader({
  doctorName,
  specialty,
}: {
  doctorName: string
  specialty: string
}) {
  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">{doctorName}</h1>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono">{specialty}</span>
        </div>
      </div>
    </header>
  )
}
