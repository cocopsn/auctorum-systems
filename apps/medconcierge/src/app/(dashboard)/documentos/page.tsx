'use client'

/**
 * /documentos — drag-drop upload + lista filtrable. AI clasifica + asigna a
 * paciente en el upload; cuando no encuentra match, la card muestra los
 * pacientes sugeridos con botón "Asignar" inline.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileText,
  FileUp,
  Loader2,
  Search as SearchIcon,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Archive,
  RefreshCcw,
  X,
} from 'lucide-react'

type DocStatus = 'pending_assignment' | 'assigned' | 'archived'
type DocType =
  | 'lab_result'
  | 'radiology'
  | 'prescription'
  | 'referral'
  | 'insurance'
  | 'other'

type DocItem = {
  id: string
  fileName: string
  fileType: string | null
  fileSize: number | null
  documentType: DocType | null
  documentDate: string | null
  aiSummary: string | null
  status: DocStatus
  patientId: string | null
  patientName: string | null
  createdAt: string
}

type SuggestedPatient = { id: string; name: string }

const TYPE_LABEL: Record<DocType, string> = {
  lab_result: 'Laboratorio',
  radiology: 'Radiología',
  prescription: 'Receta',
  referral: 'Referencia',
  insurance: 'Aseguradora',
  other: 'Otro',
}

const STATUS_LABEL: Record<DocStatus, string> = {
  pending_assignment: 'Sin asignar',
  assigned: 'Asignado',
  archived: 'Archivado',
}

function fmtBytes(n: number | null): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
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

export default function DocumentsPage() {
  const [items, setItems] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploadResults, setUploadResults] = useState<
    Array<{
      docId: string
      fileName: string
      analysisType: DocType
      summary: string | null
      assigned: boolean
      suggestions: SuggestedPatient[]
    }>
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '200')
      const res = await fetch(`/api/dashboard/documents?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setItems(data.items ?? [])
    } catch (err: any) {
      setError(err?.message || 'Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, search])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  async function uploadFiles(files: FileList | File[]) {
    const fileArr = Array.from(files)
    if (fileArr.length === 0) return
    setUploading(true)
    const results: typeof uploadResults = []
    for (const file of fileArr) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/dashboard/documents', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          results.push({
            docId: '',
            fileName: file.name,
            analysisType: 'other',
            summary: data?.error || `Error: ${res.status}`,
            assigned: false,
            suggestions: [],
          })
          continue
        }
        results.push({
          docId: data.document?.id ?? '',
          fileName: file.name,
          analysisType: data.document?.documentType ?? 'other',
          summary: data.analysis?.summary ?? null,
          assigned: !data.needsAssignment,
          suggestions: (data.suggestedPatients ?? []) as SuggestedPatient[],
        })
      } catch (err: any) {
        results.push({
          docId: '',
          fileName: file.name,
          analysisType: 'other',
          summary: err?.message || 'Error al subir',
          assigned: false,
          suggestions: [],
        })
      }
    }
    setUploadResults(results)
    setUploading(false)
    fetchList()
  }

  async function assign(docId: string, patientId: string) {
    setBusyId(docId)
    try {
      const res = await fetch(`/api/dashboard/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patientId }),
      })
      if (!res.ok) throw new Error(await res.text())
      // remove from upload results once assigned
      setUploadResults((prev) => prev.filter((r) => r.docId !== docId))
      fetchList()
    } catch (err: any) {
      alert(err?.message || 'Error')
    } finally {
      setBusyId(null)
    }
  }

  async function archive(docId: string) {
    setBusyId(docId)
    try {
      const res = await fetch(`/api/dashboard/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'archived' }),
      })
      if (!res.ok) throw new Error(await res.text())
      fetchList()
    } catch (err: any) {
      alert(err?.message || 'Error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(docId: string) {
    if (!confirm('¿Borrar permanentemente?')) return
    setBusyId(docId)
    try {
      const res = await fetch(`/api/dashboard/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      fetchList()
    } catch (err: any) {
      alert(err?.message || 'Error')
    } finally {
      setBusyId(null)
    }
  }

  async function viewDocument(docId: string) {
    try {
      const res = await fetch(`/api/dashboard/documents/${docId}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
    } catch (err: any) {
      alert(err?.message || 'Error')
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Documentos</h1>
        <p className="text-sm text-slate-500">
          Sube laboratorios, radiografías, recetas. La IA los clasifica y los asigna
          al paciente correcto.
        </p>
      </header>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files)
        }}
        className={`mb-6 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-cyan-700 bg-cyan-50'
            : 'border-slate-200 bg-white hover:border-cyan-700 hover:bg-cyan-50/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files)
            e.currentTarget.value = ''
          }}
        />
        <FileUp className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-700">
          {uploading ? 'Subiendo y analizando…' : 'Arrastra archivos o haz clic para seleccionar'}
        </p>
        <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, WebP, HEIC · máx 25 MB</p>
        {uploading && <Loader2 className="mx-auto mt-3 h-4 w-4 animate-spin text-cyan-700" />}
      </div>

      {/* Upload results panel — assignment suggestions */}
      {uploadResults.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Resultados del análisis</h2>
            <button
              type="button"
              onClick={() => setUploadResults([])}
              aria-label="Cerrar"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-3">
            {uploadResults.map((r, i) => (
              <li key={i} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{r.fileName}</p>
                    <p className="text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {TYPE_LABEL[r.analysisType] ?? 'Otro'}
                      </span>{' '}
                      {r.summary}
                    </p>
                  </div>
                  {r.assigned ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Asignado
                    </span>
                  ) : null}
                </div>
                {!r.assigned && r.docId && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500">
                      {r.suggestions.length > 0
                        ? 'Pacientes sugeridos:'
                        : 'No se encontró paciente. Asigna manualmente desde la lista abajo.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => assign(r.docId, p.id)}
                          className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800 hover:bg-cyan-100"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filters */}
      <section className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar por nombre o resumen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchList()
            }}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-cyan-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pending_assignment">Sin asignar</option>
          <option value="assigned">Asignados</option>
          <option value="archived">Archivados</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(TYPE_LABEL) as DocType[]).map((k) => (
            <option key={k} value={k}>
              {TYPE_LABEL[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchList}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Refrescar
        </button>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          No hay documentos. Sube uno con drag-and-drop arriba.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Archivo</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => viewDocument(d.id)}
                          className="text-left text-sm font-medium text-slate-900 hover:underline"
                        >
                          {d.fileName}
                        </button>
                        {d.aiSummary && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {d.aiSummary}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {fmtBytes(d.fileSize)} · {d.fileType ?? 'desconocido'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {d.documentType ? TYPE_LABEL[d.documentType] : 'Otro'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {d.patientName ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.status === 'assigned'
                          ? 'bg-emerald-100 text-emerald-700'
                          : d.status === 'archived'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {d.documentDate ?? fmtDate(d.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => viewDocument(d.id)}
                        title="Abrir"
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {d.status !== 'archived' && (
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => archive(d.id)}
                          title="Archivar"
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => remove(d.id)}
                        title="Borrar"
                        className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
