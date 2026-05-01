"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText, Plus, Pin, Trash2, Search, ChevronDown,
  Stethoscope, FlaskConical, Pill, ArrowUpRight, ClipboardList,
  MessageSquare, Scissors, ScanLine, UserPlus, NotebookPen,
} from "lucide-react"

type RecordSummary = {
  id: string
  title: string
  recordType: string
  isPinned: boolean
  isDraft: boolean
  createdAt: string
  content: any
  fileCount: number
}

type Props = {
  patientId: string
  onSelectRecord: (id: string) => void
  selectedId?: string
  onRecordCreated?: () => void
}

const RECORD_TYPES = [
  { value: "general", label: "General", color: "bg-slate-100 text-slate-700", icon: MessageSquare },
  { value: "consultation", label: "Consulta", color: "bg-blue-100 text-blue-700", icon: Stethoscope },
  { value: "soap", label: "SOAP", color: "bg-indigo-100 text-indigo-700", icon: NotebookPen },
  { value: "follow_up", label: "Seguimiento", color: "bg-green-100 text-green-700", icon: ClipboardList },
  { value: "lab_result", label: "Laboratorio", color: "bg-purple-100 text-purple-700", icon: FlaskConical },
  { value: "prescription", label: "Prescripci\u00f3n", color: "bg-amber-100 text-amber-700", icon: Pill },
  { value: "referral", label: "Referencia", color: "bg-teal-100 text-teal-700", icon: ArrowUpRight },
  { value: "procedure", label: "Procedimiento", color: "bg-rose-100 text-rose-700", icon: Scissors },
  { value: "imaging", label: "Imagenolog\u00eda", color: "bg-cyan-100 text-cyan-700", icon: ScanLine },
  { value: "first_visit", label: "Primera consulta", color: "bg-emerald-100 text-emerald-700", icon: UserPlus },
] as const

function getTypeConfig(type: string) {
  return RECORD_TYPES.find(t => t.value === type) ?? RECORD_TYPES[0]
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(date))
}

function getPlainText(content: any): string {
  if (!content) return ""
  if (typeof content === "string") return content
  if (content.content) {
    return content.content
      .map((node: any) => {
        if (node.text) return node.text
        if (node.content) return getPlainText(node)
        return ""
      })
      .join(" ")
      .slice(0, 100)
  }
  return ""
}

export default function ClinicalRecordsList({ patientId, onSelectRecord, selectedId, onRecordCreated }: Props) {
  const [records, setRecords] = useState<RecordSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterType !== "all") params.set("type", filterType)
      const res = await fetch(`/api/dashboard/patients/${patientId}/records?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setRecords(data.records ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [patientId, filterType])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function createRecord(type: string) {
    setCreating(true)
    setShowNewMenu(false)
    try {
      const typeConfig = getTypeConfig(type)
      const res = await fetch(`/api/dashboard/patients/${patientId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Nueva ${typeConfig.label.toLowerCase()}`,
          recordType: type,
          isDraft: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchRecords()
        onSelectRecord(data.record.id)
        onRecordCreated?.()
      }
    } catch { /* ignore */ }
    setCreating(false)
  }

  async function deleteRecord(e: React.MouseEvent, recordId: string) {
    e.stopPropagation()
    if (!confirm("\u00bfEliminar este expediente? Esta acci\u00f3n no se puede deshacer.")) return
    try {
      await fetch(`/api/dashboard/patients/${patientId}/records/${recordId}`, { method: "DELETE" })
      await fetchRecords()
      if (selectedId === recordId) onSelectRecord("")
    } catch { /* ignore */ }
  }

  async function togglePin(e: React.MouseEvent, record: RecordSummary) {
    e.stopPropagation()
    try {
      await fetch(`/api/dashboard/patients/${patientId}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !record.isPinned }),
      })
      await fetchRecords()
    } catch { /* ignore */ }
  }

  const filtered = records.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.title.toLowerCase().includes(s) || getPlainText(r.content).toLowerCase().includes(s)
  })

  return (
    <div className="flex flex-col h-full bg-[#F8FAFB]">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Expedientes</h3>
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              disabled={creating}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
              <ChevronDown className="w-3 h-3" />
            </button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                  {RECORD_TYPES.map(t => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.value}
                        onClick={() => createRecord(t.value)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-slate-400" />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              filterType === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos
          </button>
          {RECORD_TYPES.slice(0, 5).map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(filterType === t.value ? "all" : t.value)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                filterType === t.value ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-8">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 mb-1">Sin expedientes</p>
            <p className="text-xs text-slate-400">Crea el primer registro de este paciente</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(record => {
              const typeConfig = getTypeConfig(record.recordType)
              const TypeIcon = typeConfig.icon
              const isSelected = selectedId === record.id
              const preview = getPlainText(record.content)

              return (
                <button
                  key={record.id}
                  onClick={() => onSelectRecord(record.id)}
                  className={`w-full text-left px-4 py-3 transition-colors group ${
                    isSelected
                      ? "bg-teal-50 border-l-2 border-l-teal-600"
                      : "hover:bg-white border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {record.isPinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${typeConfig.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                        {record.isDraft && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
                            Borrador
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 truncate">{record.title}</p>
                      {preview && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{preview}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(record.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={e => togglePin(e, record)}
                        className={`p-1 rounded transition-colors ${
                          record.isPinned ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
                        }`}
                        title={record.isPinned ? "Desfijar" : "Fijar"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => deleteRecord(e, record.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
