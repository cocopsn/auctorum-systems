'use client'

import { useState } from 'react'
import { Check, Loader2, Send } from 'lucide-react'

type Row = {
  id: string
  date: string
  startTime: string
  status: string | null
  reminder24hSent: boolean | null
  reminder24hSentAt: Date | null
  reminder2hSent: boolean | null
  reminder2hSentAt: Date | null
  confirmedByPatient: boolean | null
  patientName: string
  patientPhone: string
}

export function RecordatoriosTable({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<Row[]>(rows)
  const [pending, setPending] = useState<{ id: string; type: '24h' | '2h' } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendNow(id: string, type: '24h' | '2h') {
    setError(null)
    setPending({ id, type })
    try {
      const res = await fetch(`/api/appointments/${id}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error desconocido')
      setState((cur) =>
        cur.map((r) =>
          r.id === id
            ? type === '24h'
              ? { ...r, reminder24hSent: true, reminder24hSentAt: new Date() }
              : { ...r, reminder2hSent: true, reminder2hSentAt: new Date() }
            : r,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setPending(null)
    }
  }

  if (state.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-10 text-center">
        <p className="text-sm text-[var(--text-tertiary)]">
          No hay citas programadas en las próximas 48 horas.
        </p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-3 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-2 text-sm text-[var(--error)]">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)]">
            <tr className="text-[var(--text-tertiary)]">
              <th className="text-left px-5 py-3 text-[11px] font-mono uppercase tracking-wide">
                Paciente
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-mono uppercase tracking-wide">
                Cuándo
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-mono uppercase tracking-wide">
                Confirmado
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-mono uppercase tracking-wide">
                24h
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-mono uppercase tracking-wide">
                2h
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {state.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-[var(--text-primary)]">{r.patientName}</p>
                  <p className="text-xs text-[var(--text-tertiary)] font-mono">{r.patientPhone}</p>
                </td>
                <td className="px-5 py-3 text-[var(--text-secondary)]">
                  {new Date(r.date + 'T12:00:00').toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  <span className="text-xs text-[var(--text-tertiary)] ml-2 font-mono">
                    {r.startTime.slice(0, 5)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {r.confirmedByPatient ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--success)]">
                      <Check className="h-3 w-3" /> Sí
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <ReminderCell
                    sent={!!r.reminder24hSent}
                    isPending={pending?.id === r.id && pending.type === '24h'}
                    onSend={() => sendNow(r.id, '24h')}
                  />
                </td>
                <td className="px-5 py-3">
                  <ReminderCell
                    sent={!!r.reminder2hSent}
                    isPending={pending?.id === r.id && pending.type === '2h'}
                    onSend={() => sendNow(r.id, '2h')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ReminderCell({
  sent,
  isPending,
  onSend,
}: {
  sent: boolean
  isPending: boolean
  onSend: () => void
}) {
  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--success)]">
        <Check className="h-3 w-3" />
        Enviado
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
      Enviar ahora
    </button>
  )
}
