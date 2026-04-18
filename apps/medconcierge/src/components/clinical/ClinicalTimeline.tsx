"use client"

import { useState, useEffect } from "react"
import { Stethoscope, Calendar, Paperclip, FileText } from "lucide-react"

type TimelineItem = {
  type: "record" | "appointment" | "file"
  date: string
  data: Record<string, any>
}

type Props = {
  patientId: string
  onSelectRecord?: (id: string) => void
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  record: { icon: FileText, color: "bg-indigo-100 text-indigo-600 border-indigo-200", label: "Expediente" },
  appointment: { icon: Calendar, color: "bg-green-100 text-green-600 border-green-200", label: "Cita" },
  file: { icon: Paperclip, color: "bg-slate-100 text-slate-600 border-slate-200", label: "Archivo" },
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date))
}

export default function ClinicalTimeline({ patientId, onSelectRecord }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dashboard/patients/${patientId}/timeline`)
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) return <p className="text-xs text-slate-400 text-center py-8">Cargando timeline...</p>

  if (items.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Stethoscope className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">Sin actividad registrada</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-4">
          {items.map((item, i) => {
            const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.record
            const Icon = config.icon
            const title =
              item.type === "record" ? (item.data.title as string) :
              item.type === "appointment" ? (`Cita: ${item.data.reason || "Sin motivo"}`) :
              (item.data.filename as string)

            return (
              <div key={`${item.type}-${item.data.id}-${i}`} className="relative flex gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${config.color} z-10 bg-white`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div
                  className={`flex-1 bg-white rounded-lg border border-slate-200 p-3 ${
                    item.type === "record" ? "cursor-pointer hover:border-teal-300 transition-colors" : ""
                  }`}
                  onClick={() => {
                    if (item.type === "record") onSelectRecord?.(item.data.id as string)
                  }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {config.label}
                    </span>
                    {item.type === "record" && item.data.isDraft && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
                        Borrador
                      </span>
                    )}
                    {item.type === "appointment" && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.data.status === "completed" ? "bg-green-100 text-green-700" :
                        item.data.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {item.data.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(item.date)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
