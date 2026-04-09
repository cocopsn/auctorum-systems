'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

type Props = {
  tenantName: string
  userName: string | null
}

export function WelcomeBanner({ tenantName, userName }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const firstName = userName ? userName.split(' ')[0] : ''

  return (
    <div className="mb-6 rounded-xl border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/10 to-transparent p-4 relative">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        className="absolute top-3 right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[var(--accent)]/20 p-2">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Bienvenido{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Su espacio{' '}
            <strong className="text-[var(--text-primary)]">{tenantName}</strong> está
            listo. Siga los pasos abajo para dejar su cuenta operativa.
          </p>
        </div>
      </div>
    </div>
  )
}
