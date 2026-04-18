"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { useDebounce } from "use-debounce"
import {
  Bold, Italic, Underline as UnderlineIcon, Highlighter,
  List, ListOrdered, AlignLeft, AlignCenter, Heading2, Heading3,
  Check, Loader2, AlertCircle, ImagePlus,
} from "lucide-react"

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
  record: ClinicalRecord
  patientId: string
  onSave?: () => void
}

type SaveStatus = "saved" | "saving" | "unsaved" | "error"

function ToolbarButton({
  active, onClick, children, title,
}: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-slate-200 text-slate-900"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  )
}

function SOAPEditor({
  record, patientId, onStatusChange,
}: {
  record: ClinicalRecord; patientId: string; onStatusChange: (s: SaveStatus) => void
}) {
  const [fields, setFields] = useState({
    soapSubjective: record.soapSubjective ?? "",
    soapObjective: record.soapObjective ?? "",
    soapAssessment: record.soapAssessment ?? "",
    soapPlan: record.soapPlan ?? "",
  })
  const [debouncedFields] = useDebounce(fields, 1500)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    onStatusChange("saving")
    fetch(`/api/dashboard/patients/${patientId}/records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(debouncedFields),
    })
      .then(r => { onStatusChange(r.ok ? "saved" : "error") })
      .catch(() => onStatusChange("error"))
  }, [debouncedFields])

  const sections = [
    { key: "soapSubjective" as const, label: "S \u2014 Subjetivo", color: "border-l-blue-500", placeholder: "S\u00edntomas que describe el paciente..." },
    { key: "soapObjective" as const, label: "O \u2014 Objetivo", color: "border-l-green-500", placeholder: "Signos vitales, exploraci\u00f3n f\u00edsica..." },
    { key: "soapAssessment" as const, label: "A \u2014 Evaluaci\u00f3n", color: "border-l-amber-500", placeholder: "Diagn\u00f3stico y an\u00e1lisis..." },
    { key: "soapPlan" as const, label: "P \u2014 Plan", color: "border-l-violet-500", placeholder: "Tratamiento, seguimiento..." },
  ]

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = Math.max(120, el.scrollHeight) + "px"
  }

  return (
    <div className="space-y-4 max-w-[720px] mx-auto px-4 py-6">
      {sections.map(s => (
        <div key={s.key} className={`bg-white rounded-lg border border-slate-200 ${s.color} border-l-4 p-4`}>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            {s.label}
          </label>
          <textarea
            value={fields[s.key]}
            onChange={e => {
              setFields(prev => ({ ...prev, [s.key]: e.target.value }))
              onStatusChange("unsaved")
              autoResize(e.target)
            }}
            placeholder={s.placeholder}
            rows={4}
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      ))}
    </div>
  )
}

export default function ClinicalEditor({ record, patientId, onSave }: Props) {
  const [title, setTitle] = useState(record.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [debouncedTitle] = useDebounce(title, 1500)
  const isFirstTitle = useRef(true)
  const isFirstContent = useRef(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isFirstTitle.current) { isFirstTitle.current = false; return }
    if (debouncedTitle === record.title) return
    setSaveStatus("saving")
    fetch(`/api/dashboard/patients/${patientId}/records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: debouncedTitle }),
    })
      .then(r => { setSaveStatus(r.ok ? "saved" : "error"); onSave?.() })
      .catch(() => setSaveStatus("error"))
  }, [debouncedTitle])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Escribe aqu\u00ed las notas cl\u00ednicas..." }),
      Highlight,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: record.content && typeof record.content === "object" && Object.keys(record.content).length > 0
      ? record.content
      : "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-8 py-6 text-[15px] leading-[1.8]",
      },
    },
    onUpdate: () => {
      setSaveStatus("unsaved")
    },
  })

  const [debouncedJson] = useDebounce(
    editor ? JSON.stringify(editor.getJSON()) : null,
    1500,
  )

  useEffect(() => {
    if (isFirstContent.current) { isFirstContent.current = false; return }
    if (!debouncedJson || !editor) return
    setSaveStatus("saving")
    fetch(`/api/dashboard/patients/${patientId}/records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: JSON.parse(debouncedJson) }),
    })
      .then(r => { setSaveStatus(r.ok ? "saved" : "error"); onSave?.() })
      .catch(() => setSaveStatus("error"))
  }, [debouncedJson])

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) return
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await fetch(
        `/api/dashboard/patients/${patientId}/records/${record.id}/files`,
        { method: "POST", body: form },
      )
      if (!res.ok) return
      const data = await res.json()
      if (editor && data.file) {
        editor.chain().focus().insertContent(`[Archivo: ${data.file.filename}]`).run()
      }
    } catch { /* swallow */ }
  }

  const isSOAP = record.recordType === "soap"

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200">
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setSaveStatus("unsaved") }}
          placeholder="T\u00edtulo del expediente"
          className="flex-1 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
        />
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="w-3.5 h-3.5" /> Guardado
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-amber-600 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-slate-400">Sin guardar</span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-3.5 h-3.5" /> Error
            </span>
          )}
        </div>
      </div>

      {isSOAP ? (
        <div className="flex-1 overflow-y-auto">
          <SOAPEditor record={record} patientId={patientId} onStatusChange={setSaveStatus} />
        </div>
      ) : (
        <>
          {editor && (
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex-wrap">
              <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Subrayado">
                <UnderlineIcon className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Resaltar">
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="T\u00edtulo 2">
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="T\u00edtulo 3">
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Izquierda">
                <AlignLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centrar">
                <AlignCenter className="w-4 h-4" />
              </ToolbarButton>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insertar imagen">
                <ImagePlus className="w-4 h-4" />
              </ToolbarButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleImageUpload(f)
                  e.target.value = ""
                }}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[720px] mx-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
