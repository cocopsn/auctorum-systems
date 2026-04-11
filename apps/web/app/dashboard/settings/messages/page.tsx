'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Save, MessageSquare, Check } from 'lucide-react'

const MESSAGE_DEFS = [
  { key: 'welcome', label: 'Mensaje de bienvenida', description: 'Se envía cuando un cliente contacta por primera vez', variables: '{nombre}, {negocio}' },
  { key: 'out_of_catalog', label: 'Fuera de catálogo', description: 'Cuando preguntan por algo que no manejas', variables: '{nombre}, {negocio}' },
  { key: 'out_of_stock', label: 'Sin inventario', description: 'Producto temporalmente no disponible', variables: '{nombre}, {producto}' },
  { key: 'order_confirmed', label: 'Pedido confirmado', description: 'Confirmación de pedido o cotización aceptada', variables: '{nombre}, {negocio}, {producto}' },
  { key: 'appointment_confirmed', label: 'Cita confirmada', description: 'Confirmación de cita agendada', variables: '{nombre}, {fecha}, {hora}, {servicio}' },
  { key: 'appointment_reminder', label: 'Recordatorio de cita', description: 'Se envía antes de la cita programada', variables: '{nombre}, {fecha}, {hora}' },
  { key: 'recall', label: 'Recall / Seguimiento', description: 'Invitación para regresar después de un tiempo', variables: '{nombre}, {negocio}' },
]

export default function BotMessagesPage() {
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/settings/messages')
      .then(r => r.json())
      .then(data => setMessages(data.messages || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/dashboard/settings/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {}
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          Mensajes del Bot
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configura los mensajes que el bot envía a tus clientes en cada evento
        </p>
      </div>

      <div className="space-y-6">
        {MESSAGE_DEFS.map(def => (
          <div key={def.key} className="bg-white rounded-xl border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-0.5">{def.label}</label>
            <p className="text-xs text-gray-500 mb-3">{def.description}</p>
            <textarea
              value={messages[def.key] || ''}
              onChange={e => setMessages(m => ({ ...m, [def.key]: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Variables disponibles: <span className="font-mono">{def.variables}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Guardado
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar cambios
            </>
          )}
        </button>
        {saved && <span className="text-sm text-green-600">Cambios guardados correctamente</span>}
      </div>
    </div>
  )
}
