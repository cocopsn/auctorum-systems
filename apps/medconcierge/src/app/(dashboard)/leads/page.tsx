'use client'

/**
 * Leads CRM — KPIs, filtros, lista, kanban del pipeline.
 *
 * Pipeline visible:
 *   NEW → CONTACTED → RESPONDED → APPOINTED → CONVERTED   (lost queda aparte)
 *
 * Actions desde la lista:
 *   • Re-enviar WhatsApp       POST /api/dashboard/leads/[id]/contact
 *   • Avanzar status            PATCH /api/dashboard/leads/[id]
 *   • Convertir a paciente+cita POST /api/dashboard/leads/[id]/convert
 *   • Marcar perdido            DELETE /api/dashboard/leads/[id]
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Facebook,
  Instagram,
  Globe2,
  Hand,
  Search as SearchIcon,
  RefreshCcw,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react'

type LeadStatus = 'new' | 'contacted' | 'responded' | 'appointed' | 'converted' | 'lost'
type LeadSource = 'facebook' | 'instagram' | 'google' | 'manual' | 'website'

type Lead = {
  id: string
  tenantId: string
  source: LeadSource
  status: LeadStatus
  name: string | null
  phone: string | null
  email: string | null
  message: string | null
  campaignName: string | null
  whatsappSent: boolean
  whatsappSentAt: string | null
  patientId: string | null
  appointmentId: string | null
  createdAt: string
}

type ApiResponse = {
  items: Lead[]
  total: number
  pipeline: Record<LeadStatus, number>
  kpis: {
    total: number
    contacted: number
    appointed: number
    converted: number
    conversionRate: number
  }
}

const SOURCE_META: Record<LeadSource, { label: string; Icon: any; tone: string }> = {
  facebook: { label: 'Facebook', Icon: Facebook, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  instagram: { label: 'Instagram', Icon: Instagram, tone: 'bg-pink-50 text-pink-700 border-pink-200' },
  google: { label: 'Google', Icon: Globe2, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  website: { label: 'Web', Icon: Globe2, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
  manual: { label: 'Manual', Icon: Hand, tone: 'bg-amber-50 text-amber-800 border-amber-200' },
}

const STATUS_META: Record<LeadStatus, { label: string; tone: string }> = {
  new: { label: 'Nuevo', tone: 'bg-slate-100 text-slate-700' },
  contacted: { label: 'Contactado', tone: 'bg-blue-100 text-blue-700' },
  responded: { label: 'Respondió', tone: 'bg-violet-100 text-violet-700' },
  appointed: { label: 'Con cita', tone: 'bg-amber-100 text-amber-700' },
  converted: { label: 'Convertido', tone: 'bg-emerald-100 text-emerald-700' },
  lost: { label: 'Perdido', tone: 'bg-rose-100 text-rose-700' },
}

const KANBAN_COLUMNS: LeadStatus[] = ['new', 'contacted', 'responded', 'appointed', 'converted']

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function LeadsPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'kanban'>('list')

  // filtros
  const [source, setSource] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (source) params.set('source', source)
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '200')

      const res = await fetch(`/api/dashboard/leads?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar leads')
    } finally {
      setLoading(false)
    }
  }, [source, status, search])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const byStatus = useMemo<Record<LeadStatus, Lead[]>>(() => {
    const empty = {
      new: [],
      contacted: [],
      responded: [],
      appointed: [],
      converted: [],
      lost: [],
    } as Record<LeadStatus, Lead[]>
    if (!data) return empty
    for (const l of data.items) empty[l.status].push(l)
    return empty
  }, [data])

  async function changeStatus(lead: Lead, next: LeadStatus) {
    setBusyId(lead.id)
    try {
      const res = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchLeads()
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar')
    } finally {
      setBusyId(null)
    }
  }

  async function manualContact(lead: Lead) {
    setBusyId(lead.id)
    try {
      const res = await fetch(`/api/dashboard/leads/${lead.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Error al enviar WhatsApp')
      }
      await fetchLeads()
    } catch (err: any) {
      alert(err?.message || 'Error al enviar')
    } finally {
      setBusyId(null)
    }
  }

  async function markLost(lead: Lead) {
    if (!confirm('¿Marcar este lead como perdido?')) return
    setBusyId(lead.id)
    try {
      const res = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchLeads()
    } catch (err: any) {
      alert(err?.message || 'Error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">
            Captura y seguimiento de leads de campañas (Facebook/Instagram/Google) y formularios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLeads}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refrescar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-800"
          >
            <Plus className="h-4 w-4" />
            Nuevo lead
          </button>
        </div>
      </header>

      {/* KPI cards */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label="Total" value={data?.kpis.total ?? '—'} />
        <KpiCard label="Contactados" value={data?.kpis.contacted ?? '—'} />
        <KpiCard label="Con cita" value={data?.kpis.appointed ?? '—'} />
        <KpiCard label="Convertidos" value={data?.kpis.converted ?? '—'} />
        <KpiCard
          label="Tasa conversión"
          value={
            data ? `${(data.kpis.conversionRate * 100).toFixed(1)}%` : '—'
          }
        />
      </section>

      {/* Filtros + view toggle */}
      <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar nombre, teléfono, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchLeads()
              }}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-cyan-700"
            />
          </div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas las fuentes</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="google">Google</option>
            <option value="website">Web</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="new">Nuevo</option>
            <option value="contacted">Contactado</option>
            <option value="responded">Respondió</option>
            <option value="appointed">Con cita</option>
            <option value="converted">Convertido</option>
            <option value="lost">Perdido</option>
          </select>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-md px-3 py-1.5 font-medium ${
              view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={`rounded-md px-3 py-1.5 font-medium ${
              view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Kanban
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : view === 'list' ? (
        <ListView
          items={data?.items ?? []}
          busyId={busyId}
          onChangeStatus={changeStatus}
          onContact={manualContact}
          onMarkLost={markLost}
        />
      ) : (
        <KanbanView
          byStatus={byStatus}
          busyId={busyId}
          onChangeStatus={changeStatus}
          onContact={manualContact}
        />
      )}

      {showCreate && (
        <CreateLeadModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchLeads()
          }}
        />
      )}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function SourceBadge({ source }: { source: LeadSource }) {
  const meta = SOURCE_META[source] ?? SOURCE_META.manual
  const { Icon } = meta
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }: { status: LeadStatus }) {
  // Defensive lookup — if the DB ever returns a status string outside
  // LEAD_STATUSES (older row, manual SQL change, future enum addition not
  // yet shipped to UI), fall back to the 'new' style instead of crashing
  // with `Cannot read property 'tone' of undefined` (which manifests as
  // "Application error: a client-side exception" — the page goes blank).
  const meta = STATUS_META[status] ?? STATUS_META.new
  const label = STATUS_META[status]?.label ?? String(status ?? '?')
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.tone}`}>
      {label}
    </span>
  )
}

function ListView({
  items,
  busyId,
  onChangeStatus,
  onContact,
  onMarkLost,
}: {
  items: Lead[]
  busyId: string | null
  onChangeStatus: (l: Lead, s: LeadStatus) => void
  onContact: (l: Lead) => void
  onMarkLost: (l: Lead) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
        Sin leads. Conecta Facebook/Google Ads en Configuración → Publicidad para empezar.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Origen</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">WhatsApp</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{lead.name || 'Sin nombre'}</div>
                <div className="text-xs text-slate-500">
                  {lead.phone || '—'}
                  {lead.email ? ` · ${lead.email}` : ''}
                </div>
                {lead.campaignName && (
                  <div className="text-[11px] text-slate-400">{lead.campaignName}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <SourceBadge source={lead.source} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {lead.whatsappSent ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Enviado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <XCircle className="h-3.5 w-3.5" /> No enviado
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(lead.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  {lead.phone && (
                    <button
                      type="button"
                      disabled={busyId === lead.id}
                      onClick={() => onContact(lead)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      title="Re-enviar WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <select
                    value={lead.status}
                    disabled={busyId === lead.id}
                    onChange={(e) => onChangeStatus(lead, e.target.value as LeadStatus)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                  {lead.status !== 'lost' && lead.status !== 'converted' && (
                    <button
                      type="button"
                      disabled={busyId === lead.id}
                      onClick={() => onMarkLost(lead)}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                      title="Marcar como perdido"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KanbanView({
  byStatus,
  busyId,
  onChangeStatus,
  onContact,
}: {
  byStatus: Record<LeadStatus, Lead[]>
  busyId: string | null
  onChangeStatus: (l: Lead, s: LeadStatus) => void
  onContact: (l: Lead) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {KANBAN_COLUMNS.map((col) => {
        const items = byStatus[col]
        return (
          <div key={col} className="flex min-h-[300px] flex-col rounded-xl bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {STATUS_META[col].label}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
                  —
                </div>
              ) : (
                items.map((lead) => {
                  const idx = KANBAN_COLUMNS.indexOf(col)
                  const next = idx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[idx + 1] : null
                  return (
                    <article
                      key={lead.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">
                            {lead.name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-slate-500">{lead.phone || '—'}</div>
                        </div>
                        <SourceBadge source={lead.source} />
                      </div>
                      {lead.message && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{lead.message}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{fmtDate(lead.createdAt)}</span>
                        <div className="flex items-center gap-1">
                          {lead.phone && (
                            <button
                              type="button"
                              disabled={busyId === lead.id}
                              onClick={() => onContact(lead)}
                              className="rounded-md border border-slate-200 px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </button>
                          )}
                          {next && (
                            <button
                              type="button"
                              disabled={busyId === lead.id}
                              onClick={() => onChangeStatus(lead, next)}
                              className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white hover:bg-slate-700 disabled:opacity-40"
                            >
                              → {STATUS_META[next].label}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CreateLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [autoContact, setAutoContact] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/dashboard/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name || undefined,
          phone: phone || undefined,
          email: email || undefined,
          message: message || undefined,
          source: 'manual',
          autoContact,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Error al crear lead')
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
        <h2 className="text-lg font-semibold text-slate-900">Nuevo lead manual</h2>
        <p className="mt-1 text-xs text-slate-500">
          Útil para capturar referencias o contactos que no entraron por un anuncio.
        </p>

        <div className="mt-4 space-y-3">
          <Input label="Nombre" value={name} onChange={setName} />
          <Input label="Teléfono" value={phone} onChange={setPhone} placeholder="55 1234 5678" />
          <Input label="Email" value={email} onChange={setEmail} type="email" />
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-600">Mensaje (opcional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoContact}
              onChange={(e) => setAutoContact(e.target.checked)}
            />
            Enviar WhatsApp automático
          </label>
        </div>

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
            Crear lead
          </button>
        </div>
      </form>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-700"
      />
    </label>
  )
}
