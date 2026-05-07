'use client'

/**
 * Tab "Comunicaciones" en la ficha del paciente. Lista cronológica unificada
 * de emails enviados, mensajes de WhatsApp, llamadas registradas y notas
 * manuales. Permite agregar una nota o registrar una llamada inline.
 *
 * Uso:
 *   <PatientCommunicationsTab patientId={patient.id} />
 *
 * El tab consume `/api/dashboard/patients/[id]/communications`. Las entradas
 * de tipo email_sent / whatsapp_* se generan automáticamente desde el backend
 * cuando el call site tiene `patientId` en scope (sendEmail wrap, etc.).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Inbox,
  Plus,
  Loader2,
  X,
} from 'lucide-react'

type CommType =
  | 'email_sent'
  | 'email_received'
  | 'whatsapp_sent'
  | 'whatsapp_received'
  | 'sms_sent'
  | 'call'
  | 'note'

type CommItem = {
  id: string
  type: CommType
  subject: string | null
  content: string | null
  recipient: string | null
  externalId: string | null
  occurredAt: string
}

const TYPE_META: Record<
  CommType,
  { label: string; icon: any; color: string; bg: string }
> = {
  email_sent: {
    label: 'Email enviado',
    icon: Mail,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  email_received: {
    label: 'Email recibido',
    icon: Mail,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  whatsapp_sent: {
    label: 'WhatsApp enviado',
    icon: MessageCircle,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  whatsapp_received: {
    label: 'WhatsApp recibido',
    icon: MessageCircle,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  sms_sent: {
    label: 'SMS enviado',
    icon: MessageCircle,
    color: 'text-sky-700',
    bg: 'bg-sky-50',
  },
  call: { label: 'Llamada', icon: Phone, color: 'text-violet-700', bg: 'bg-violet-50' },
  note: { label: 'Nota', icon: StickyNote, color: 'text-slate-700', bg: 'bg-slate-100' },
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function PatientCommunicationsTab({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<CommItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/communications`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setItems(data.items ?? [])
    } catch (err: any) {
      setError(err?.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Timeline de comunicaciones</h3>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar nota / llamada
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <Inbox className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Sin comunicaciones</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Aquí verás emails, mensajes de WhatsApp y notas relacionadas con el paciente.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-slate-200 pl-5">
          {items.map((item) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.note
            const Icon = meta.icon
            return (
              <li key={item.id} className="relative">
                <span
                  className={`absolute -left-[26px] flex h-6 w-6 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    <time className="text-[11px] text-slate-400">
                      {fmtDateTime(item.occurredAt)}
                    </time>
                  </div>
                  {item.subject && (
                    <p className="mt-1 text-sm font-medium text-slate-900">{item.subject}</p>
                  )}
                  {item.content && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.content}</p>
                  )}
                  {item.recipient && (
                    <p className="mt-1 text-[11px] text-slate-400">→ {item.recipient}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {showCreate && (
        <CreateCommModal
          patientId={patientId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchItems()
          }}
        />
      )}
    </div>
  )
}

function CreateCommModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [type, setType] = useState<CommType>('note')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          subject: subject.trim() || undefined,
          content: content.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Error al guardar')
      }
      onCreated()
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Agregar entrada</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CommType)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="note">Nota</option>
            <option value="call">Llamada</option>
            <option value="email_received">Email recibido</option>
            <option value="whatsapp_received">WhatsApp recibido</option>
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Asunto / Resumen (opcional)
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Llamada de seguimiento — confirmó cita lunes"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Detalle</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        {err && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
