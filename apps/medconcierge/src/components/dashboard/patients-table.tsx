'use client'

import { useState, useEffect } from 'react'
import { Search, User } from 'lucide-react'
import Link from 'next/link'
import type { Patient } from '@quote-engine/db'

export function PatientsTable() {
  const [patients, setPatients] = useState<Patient[]>([])
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tenant-primary/30"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Citas</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">No-shows</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Última visita</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No hay pacientes registrados.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/pacientes/${p.id}`} className="font-medium text-gray-900 hover:text-tenant-primary">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{p.email ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{p.totalAppointments}</td>
                    <td className="px-4 py-3 text-right">
                      {(p.totalNoShows ?? 0) > 0 ? (
                        <span className="text-red-600 font-medium">{p.totalNoShows}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${Number(p.totalSpent ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.lastAppointmentAt
                        ? new Date(p.lastAppointmentAt).toLocaleDateString('es-MX')
                        : '—'}
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
