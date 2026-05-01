'use client'

import { useState, useEffect } from 'react'
import { Search, User, FileText } from 'lucide-react'
import Link from 'next/link'
import type { Patient } from '@quote-engine/db'

export function PatientsTable() {
  const [patients, setPatients] = useState<(Patient & { notesCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)

    fetch(`/api/dashboard/patients?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setPatients(data.patients ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    const timer = setTimeout(fetchData, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o tel\u00e9fono..."
          className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Paciente</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Tel\u00e9fono</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Email</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Citas</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Notas</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">No-shows</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">Total</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]">\u00daltima visita</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-tertiary)]">Cargando...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-tertiary)]">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No hay pacientes registrados.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/pacientes/${p.id}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{p.phone}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{p.email ?? '\u2014'}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-primary)]">{p.totalAppointments}</td>
                    <td className="px-4 py-3 text-right">
                      {(p.notesCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                          <FileText className="w-3 h-3" />
                          {p.notesCount}
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(p.totalNoShows ?? 0) > 0 ? (
                        <span className="text-[var(--error)] font-medium">{p.totalNoShows}</span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      ${Number(p.totalSpent ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">
                      {p.lastAppointmentAt
                        ? new Date(p.lastAppointmentAt).toLocaleDateString('es-MX')
                        : '\u2014'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
