'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Plus, Pin, Pencil, Trash2, X, Check, ChevronDown, ChevronUp,
  Stethoscope, FlaskConical, Pill, ArrowUpRight, MessageSquare, ClipboardList,
} from 'lucide-react'

type PatientNote = {
  id: string
  title: string | null
  content: string
  noteType: string
  isPinned: boolean
  authorId: string | null
  createdAt: string
  updatedAt: string
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700', icon: MessageSquare },
  { value: 'consultation', label: 'Consulta', color: 'bg-blue-100 text-blue-700', icon: Stethoscope },
  { value: 'follow_up', label: 'Seguimiento', color: 'bg-green-100 text-green-700', icon: ClipboardList },
  { value: 'lab_result', label: 'Laboratorio', color: 'bg-purple-100 text-purple-700', icon: FlaskConical },
  { value: 'prescription', label: 'Prescripci\u00f3n', color: 'bg-amber-100 text-amber-700', icon: Pill },
  { value: 'referral', label: 'Referencia', color: 'bg-teal-100 text-teal-700', icon: ArrowUpRight },
] as const

function getTypeConfig(type: string) {
  return NOTE_TYPES.find(t => t.value === type) ?? NOTE_TYPES[0]
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

type Props = { patientId: string }

export default function PatientNotesSection({ patientId }: Props) {
  const [notes, setNotes] = useState<PatientNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formType, setFormType] = useState('general')
  const [formPinned, setFormPinned] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/notes`)
      if (!res.ok) return
      const data = await res.json()
      setNotes(data.notes ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [patientId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  function resetForm() {
    setFormTitle('')
    setFormContent('')
    setFormType('general')
    setFormPinned(false)
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(note: PatientNote) {
    setFormTitle(note.title ?? '')
    setFormContent(note.content)
    setFormType(note.noteType)
    setFormPinned(note.isPinned)
    setEditingId(note.id)
    setShowForm(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function handleSave() {
    if (!formContent.trim()) return
    setSaving(true)
    try {
      const body = {
        title: formTitle.trim() || undefined,
        content: formContent.trim(),
        noteType: formType,
        isPinned: formPinned,
      }

      if (editingId) {
        await fetch(`/api/dashboard/patients/${patientId}/notes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`/api/dashboard/patients/${patientId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      resetForm()
      await fetchNotes()
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function handleDelete(noteId: string) {
    try {
      await fetch(`/api/dashboard/patients/${patientId}/notes/${noteId}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await fetchNotes()
    } catch { /* ignore */ }
  }

  async function togglePin(note: PatientNote) {
    try {
      await fetch(`/api/dashboard/patients/${patientId}/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      })
      await fetchNotes()
    } catch { /* ignore */ }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 300) + 'px'
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notas Cl&#237;nicas
          {notes.length > 0 && (
            <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </h2>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva nota
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {editingId ? 'Editar nota' : 'Nueva nota cl\u00ednica'}
            </span>
            <button onClick={resetForm} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="T\u00edtulo (opcional)"
            className="w-full px-3 py-2 mb-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />

          <textarea
            ref={textareaRef}
            value={formContent}
            onChange={e => { setFormContent(e.target.value); autoResize(e.target) }}
            placeholder="Contenido de la nota..."
            rows={4}
            className="w-full px-3 py-2 mb-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
          />

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-tertiary)]">Tipo:</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                {NOTE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setFormPinned(!formPinned)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                formPinned
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Pin className="w-3 h-3" />
              {formPinned ? 'Fijada' : 'Fijar'}
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!formContent.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Cargando notas...</p>
      ) : notes.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
          Sin notas cl&#237;nicas. Haz click en &quot;Nueva nota&quot; para agregar una.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => {
            const typeConfig = getTypeConfig(note.noteType)
            const TypeIcon = typeConfig.icon
            const isExpanded = expandedId === note.id
            const isLong = note.content.length > 200

            return (
              <div
                key={note.id}
                className={`p-3 rounded-lg border transition-colors ${
                  note.isPinned
                    ? 'bg-amber-50/50 border-amber-200/60'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${typeConfig.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig.label}
                      </span>
                      {note.title && (
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{note.title}</span>
                      )}
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                      {isLong && !isExpanded ? note.content.slice(0, 200) + '...' : note.content}
                    </p>

                    {isLong && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : note.id)}
                        className="flex items-center gap-1 mt-1 text-xs text-[var(--accent)] hover:underline"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Menos' : 'M\u00e1s'}
                      </button>
                    )}

                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">{formatDate(note.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => togglePin(note)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        note.isPinned
                          ? 'text-amber-500 hover:bg-amber-100'
                          : 'text-[var(--text-tertiary)] hover:text-amber-500 hover:bg-[var(--bg-secondary)]'
                      }`}
                      title={note.isPinned ? 'Desfijar' : 'Fijar'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirm === note.id ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="px-2 py-1 text-[10px] bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(note.id)}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
