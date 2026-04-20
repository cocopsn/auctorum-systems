"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Clock, Paperclip } from "lucide-react"
import ClinicalRecordsList from "./ClinicalRecordsList"
import ClinicalEditor from "./ClinicalEditor"
import ClinicalTimeline from "./ClinicalTimeline"
import ClinicalFileGallery from "./ClinicalFileGallery"

type ClinicalRecord = {
  id: string
  title: string
  recordType: string
  content: any
  soapSubjective: string | null
  soapObjective: string | null
  soapAssessment: string | null
  soapPlan: string | null
  isPinned: boolean
  isDraft: boolean
  createdAt: string
  updatedAt: string
  lastSavedAt: string
}

type Props = {
  patientId: string
  patientName?: string
}

type RightTab = "editor" | "timeline" | "files"

export default function PatientExpediente({ patientId, patientName }: Props) {
  const [selectedId, setSelectedId] = useState<string>("")
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>("editor")
  const [listKey, setListKey] = useState(0)

  const fetchRecord = useCallback(async (id: string) => {
    if (!id) { setSelectedRecord(null); return }
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/records/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setSelectedRecord(data.record ?? null)
    } catch { /* ignore */ }
  }, [patientId])

  useEffect(() => { fetchRecord(selectedId) }, [selectedId, fetchRecord])

  const tabs: { key: RightTab; label: string; icon: typeof FileText }[] = [
    { key: "editor", label: "Editor", icon: FileText },
    { key: "timeline", label: "Timeline", icon: Clock },
    { key: "files", label: "Archivos", icon: Paperclip },
  ]

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-[#F8FAFB] rounded-xl border border-slate-200 overflow-hidden">
      {/* Left panel: records list */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 overflow-hidden">
        <ClinicalRecordsList
          key={listKey}
          patientId={patientId}
          onSelectRecord={id => { setSelectedId(id); setRightTab("editor") }}
          selectedId={selectedId}
          onRecordCreated={() => setListKey(k => k + 1)}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white print:hidden">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setRightTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  rightTab === tab.key
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {rightTab === "editor" && (
            selectedRecord ? (
              <ClinicalEditor
                key={selectedRecord.id}
                record={selectedRecord}
                patientId={patientId}
                patientName={patientName}
                onSave={() => setListKey(k => k + 1)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <FileText className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-semibold text-slate-500 mb-1">Sin expedientes cl&iacute;nicos</h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Selecciona un expediente de la lista o crea uno nuevo para comenzar.
                </p>
              </div>
            )
          )}
          {rightTab === "timeline" && (
            <div className="h-full overflow-y-auto">
              <ClinicalTimeline patientId={patientId} onSelectRecord={id => { setSelectedId(id); setRightTab("editor") }} />
            </div>
          )}
          {rightTab === "files" && (
            <div className="h-full overflow-y-auto">
              <ClinicalFileGallery patientId={patientId} recordId={selectedId || undefined} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
