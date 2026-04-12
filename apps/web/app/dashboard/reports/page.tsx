'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Download, FileText, Table } from 'lucide-react'

function formatMXN(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getDateStr(d: Date) { return d.toISOString().split('T')[0] }

export default function ReportsPage() {
  const today = new Date()
  const [startDate, setStartDate] = useState(getDateStr(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(getDateStr(today))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/reports?startDate=${startDate}&endDate=${endDate}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar reportes')
      const d = await res.json()
      setData(d)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar reportes')
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { fetchReport() }, [fetchReport])

  function setPreset(label: string) {
    const now = new Date()
    let s: Date, e: Date = now
    switch (label) {
      case 'week': {
        const day = now.getDay()
        s = new Date(now)
        s.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
        break
      }
      case 'month':
        s = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'lastMonth':
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        e = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case '3months':
        s = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      default:
        s = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    setStartDate(getDateStr(s))
    setEndDate(getDateStr(e))
  }

  async function downloadExport(type: string) {
    try {
      const res = await fetch(`/api/dashboard/reports/export?startDate=${startDate}&endDate=${endDate}&type=${type}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al exportar reporte')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${startDate}-${endDate}.${type === 'csv' ? 'csv' : 'html'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al exportar reporte')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Reportes
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Analiza el rendimiento de tu negocio</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Rango de fechas</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Desde</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Hasta</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <div className="flex gap-1.5">
            {[['Esta semana','week'],['Este mes','month'],['Mes anterior','lastMonth'],['3 meses','3months']].map(([label, key]) => (
              <button key={key} onClick={() => setPreset(key)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">{label}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Total cotizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalQuotes}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Valor total</p>
              <p className="text-2xl font-bold text-gray-900">{formatMXN(data.totalValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Ticket promedio</p>
              <p className="text-2xl font-bold text-gray-900">{formatMXN(data.avgTicket)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Reporte PDF</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Descarga un reporte formateado con los datos del periodo seleccionado</p>
              <button onClick={() => downloadExport('pdf')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="h-4 w-4" /> Descargar PDF
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Table className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Exportar CSV</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Exporta los datos en formato CSV para abrir en Excel o Google Sheets</p>
              <button onClick={() => downloadExport('csv')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="h-4 w-4" /> Descargar CSV
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
