'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, Trash2, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import type { Patient, PatientFile } from '@quote-engine/db';
import { PatientCommunicationsTab } from '@/components/dashboard/patient-communications-tab';

// ============================================================
// Editable clinical-records section + file attachments list.
// Mirrors apps/web CP11 ClientDetailClient pattern: debounced
// autosave (800 ms) per textarea with "Guardando…" / "Guardado"
// hints. File ops use router.refresh() to re-fetch the server
// list. No optimistic updates — keep the UI honest.
// ============================================================

type FieldKey = 'allergies' | 'medications' | 'chronicConditions' | 'notes';

type Props = {
  patient: Patient;
  files: PatientFile[];
};

const FIELD_LABELS: Record<FieldKey, string> = {
  allergies: 'Alergias',
  medications: 'Medicamentos',
  chronicConditions: 'Condiciones crónicas',
  notes: 'Notas clínicas generales',
};

const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  allergies: 'Penicilina, nueces, látex...',
  medications: 'Metformina 500mg 2x día, Losartán 50mg 1x día...',
  chronicConditions: 'Diabetes tipo 2, hipertensión...',
  notes: 'Observaciones generales sobre el paciente.',
};

const MAX_LENGTHS: Record<FieldKey, number> = {
  allergies: 4000,
  medications: 4000,
  chronicConditions: 4000,
  notes: 8000,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

export default function PatientDetailClient({ patient, files }: Props) {
  const router = useRouter();

  const [values, setValues] = useState<Record<FieldKey, string>>({
    allergies: patient.allergies ?? '',
    medications: patient.medications ?? '',
    chronicConditions: patient.chronicConditions ?? '',
    notes: patient.notes ?? '',
  });

  const [savingField, setSavingField] = useState<FieldKey | null>(null);
  const [savedField, setSavedField] = useState<FieldKey | null>(null);

  const timers = useRef<Record<FieldKey, ReturnType<typeof setTimeout> | null>>({
    allergies: null,
    medications: null,
    chronicConditions: null,
    notes: null,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function patchPatient(body: Record<string, unknown>) {
    const res = await fetch(`/api/dashboard/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'patch failed');
    }
  }

  function handleFieldChange(field: FieldKey, value: string) {
    setValues(prev => ({ ...prev, [field]: value }));
    setSavedField(null);
    const existing = timers.current[field];
    if (existing) clearTimeout(existing);
    timers.current[field] = setTimeout(async () => {
      setSavingField(field);
      try {
        await patchPatient({ [field]: value || null });
        setSavedField(field);
        setTimeout(() => {
          setSavedField(prev => (prev === field ? null : prev));
        }, 2000);
      } catch {
        /* swallowed — user can retry by editing again */
      } finally {
        setSavingField(prev => (prev === field ? null : prev));
      }
    }, 800);
  }

  useEffect(() => () => {
    const current = timers.current;
    (Object.keys(current) as FieldKey[]).forEach(k => {
      const t = current[k];
      if (t) clearTimeout(t);
    });
  }, []);

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/dashboard/patients/${patient.id}/files`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'upload failed');
      }
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  async function handleDownload(fileId: string) {
    try {
      const res = await fetch(`/api/dashboard/patients/${patient.id}/files/${fileId}`);
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'download failed');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al descargar');
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`¿Eliminar el archivo "${filename}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/dashboard/patients/${patient.id}/files/${fileId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'delete failed');
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  return (
    <>
      {/* Clinical records — editable text fields */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Registros clínicos
        </h2>
        <div className="space-y-4">
          {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`field-${field}`}
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  {FIELD_LABELS[field]}
                </label>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {savingField === field
                    ? 'Guardando…'
                    : savedField === field
                      ? 'Guardado'
                      : `${values[field].length}/${MAX_LENGTHS[field]}`}
                </span>
              </div>
              <textarea
                id={`field-${field}`}
                value={values[field]}
                onChange={e => handleFieldChange(field, e.target.value)}
                rows={field === 'notes' ? 5 : 3}
                maxLength={MAX_LENGTHS[field]}
                placeholder={FIELD_PLACEHOLDERS[field]}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* File attachments */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Archivos adjuntos
        </h2>

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--border)] hover:border-[var(--border-hover)]'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" />
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Arrastra un archivo aquí o haz click para seleccionar
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mb-3">
            PDF, JPG, PNG, WEBP, HEIC — máx 10 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={handleFilePick}
            className="hidden"
            id="file-upload-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60"
          >
            {uploading ? 'Subiendo…' : 'Subir archivo'}
          </button>
        </div>

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-[var(--error)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[var(--error)]">{uploadError}</p>
          </div>
        )}

        {/* File list */}
        <div className="mt-4">
          {files.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
              Sin archivos adjuntos
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {files.map(file => (
                <li key={file.id} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                    {isImage(file.mimeType) ? (
                      <ImageIcon className="w-5 h-5 text-[var(--text-tertiary)]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[var(--text-tertiary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {formatSize(file.sizeBytes)} · {formatDate(file.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(file.id)}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    aria-label={`Descargar ${file.filename}`}
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id, file.filename)}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    aria-label={`Eliminar ${file.filename}`}
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Communication timeline */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <PatientCommunicationsTab patientId={patient.id} />
      </div>
    </>
  );
}
