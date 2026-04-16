'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Plus, ChevronDown } from 'lucide-react'
import type { Patient } from '@quote-engine/db'

type NoteRow = {
  id: string
  patientId: string
  patientName: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  createdAt: string
}

export function SoapNotesPage() {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NoteRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState('')
  const [form, setForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchNotes()
    fetchPatients()
  }, [])

  const fetchNotes = () => {
    setLoading(true)
    fetch('/api/dashboard/notes')
      .then((res) => res.json())
      .then((data) => {
        setNotes(data.notes ?? [])
        setLoading(false)
      })
  }

  const fetchPatients = () => {
    fetch('/api/dashboard/patients')
      .then((res) => res.json())
      .then((data) => setPatients(data.patients ?? []))
  }

  const startNew = () => {
    setEditing(null)
    setCreating(true)
    setSelectedPatient('')
    setForm({ subjective: '', objective: '', assessment: '', plan: '' })
  }

  const startEdit = (note: NoteRow) => {
    setCreating(false)
    setEditing(note)
    setForm({
      subjective: note.subjective ?? '',
      objective: note.objective ?? '',
      assessment: note.assessment ?? '',
      plan: note.plan ?? '',
    })
  }

  const handleSave = async () => {
    setSaving(true)

    if (editing) {
      await fetch('/api/dashboard/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form }),
      })
    } else {
      await fetch('/api/dashboard/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient, ...form }),
      })
    }

    setSaving(false)
    setCreating(false)
    setEditing(null)
    fetchNotes()
  }

  const showForm = creating || editing

  return (
    <div>
      {!showForm && (
        <>
          <button
            onClick={startNew}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors mb-4"
          >
            <Plus className="w-4 h-4" /> Nueva Nota
          </button>

          {loading ? (
            <div className="text-[var(--text-tertiary)]">Cargando...</div>
          ) : notes.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-8 text-center text-[var(--text-tertiary)]">
              No hay notas clínicas. Cree una nueva nota.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => startEdit(note)}
                  className="w-full text-left bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border-hover)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[var(--text-primary)]">{note.patientName}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {note.createdAt ? new Date(note.createdAt).toLocaleDateString('es-MX') : ''}
                    </span>
                  </div>
                  {note.assessment && (
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{note.assessment}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {editing ? `Nota — ${editing.patientName}` : 'Nueva Nota SOAP'}
            </h3>
            <button
              onClick={() => { setCreating(false); setEditing(null) }}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Cancelar
            </button>
          </div>

          {creating && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Paciente</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]"
              >
                <option value="">Seleccionar paciente...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SoapField label="Subjective" sublabel="Lo que el paciente reporta" value={form.subjective} onChange={(v) => setForm((f) => ({ ...f, subjective: v }))} />
            <SoapField label="Objective" sublabel="Hallazgos clínicos objetivos" value={form.objective} onChange={(v) => setForm((f) => ({ ...f, objective: v }))} />
            <SoapField label="Assessment" sublabel="Diagnóstico o impresión clínica" value={form.assessment} onChange={(v) => setForm((f) => ({ ...f, assessment: v }))} />
            <SoapField label="Plan" sublabel="Tratamiento y seguimiento" value={form.plan} onChange={(v) => setForm((f) => ({ ...f, plan: v }))} />
          </div>

          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={saving || (creating && !selectedPatient)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Nota</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SoapField({ label, sublabel, value, onChange }: { label: string; sublabel: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-0.5">{label}</label>
      <p className="text-xs text-[var(--text-tertiary)] mb-1">{sublabel}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
      />
    </div>
  )
}
