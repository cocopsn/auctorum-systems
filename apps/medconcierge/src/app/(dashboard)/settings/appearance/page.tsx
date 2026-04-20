'use client'

import { useState, useEffect } from 'react'
import { DASHBOARD_THEMES, type ThemeKey } from '@/lib/dashboard-themes'
import { ALL_SIDEBAR_ITEMS } from '@/lib/sidebar-items'

export default function AppearancePage() {
  const [theme, setTheme] = useState<ThemeKey>('teal-default')
  const [sidebarItems, setSidebarItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/settings/appearance')
      .then(r => r.json())
      .then(data => {
        setTheme(data.theme || 'teal-default')
        setSidebarItems(data.sidebarItems || ALL_SIDEBAR_ITEMS.map(i => i.id))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/dashboard/settings/appearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, sidebarItems }),
      })
      if (res.ok) {
        setSaved(true)
        // Force reload to apply theme changes to the shell
        setTimeout(() => window.location.reload(), 500)
      }
    } finally {
      setSaving(false)
    }
  }

  function toggleItem(id: string) {
    const item = ALL_SIDEBAR_ITEMS.find(i => i.id === id)
    if (item?.required) return
    setSidebarItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Personaliza tu Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Elige un tema de color y configura las secciones visibles en el menú lateral.</p>
      </div>

      {/* Theme picker */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Tema de Color</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(Object.entries(DASHBOARD_THEMES) as [ThemeKey, typeof DASHBOARD_THEMES[ThemeKey]][]).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                theme === key
                  ? 'border-gray-900 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: t.swatch }}
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: t.sidebar }}
                />
              </div>
              <p className="text-xs font-medium text-gray-700">{t.name}</p>
              {theme === key && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Vista previa</h3>
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm flex h-40">
          <div className="w-48 p-3 flex flex-col gap-1" style={{ backgroundColor: DASHBOARD_THEMES[theme].sidebar }}>
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: DASHBOARD_THEMES[theme].sidebarActive }} />
              <div className="h-2 w-16 rounded" style={{ backgroundColor: '#fff', opacity: 0.8 }} />
            </div>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md"
                style={i === 1 ? {
                  backgroundColor: DASHBOARD_THEMES[theme].sidebarActiveBg,
                  borderLeft: `2px solid ${DASHBOARD_THEMES[theme].sidebarActive}`,
                } : {}}
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: i === 1 ? DASHBOARD_THEMES[theme].sidebarActive : DASHBOARD_THEMES[theme].sidebarText, opacity: 0.6 }} />
                <div className="h-1.5 w-12 rounded" style={{ backgroundColor: i === 1 ? '#fff' : DASHBOARD_THEMES[theme].sidebarText, opacity: i === 1 ? 0.9 : 0.5 }} />
              </div>
            ))}
          </div>
          <div className="flex-1 bg-slate-50 p-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 h-full">
              <div className="h-2 w-24 rounded mb-2" style={{ backgroundColor: DASHBOARD_THEMES[theme].primary, opacity: 0.7 }} />
              <div className="h-1.5 w-36 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-8 w-16 rounded" style={{ backgroundColor: DASHBOARD_THEMES[theme].primaryLight }} />
                <div className="h-8 w-16 rounded bg-gray-100" />
                <div className="h-8 w-16 rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar items */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Secciones del menú lateral</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {(() => {
            let currentGroup = ''
            return ALL_SIDEBAR_ITEMS.map(item => {
              const showGroupHeader = item.group !== currentGroup
              currentGroup = item.group
              const Icon = item.icon
              const checked = item.required || sidebarItems.includes(item.id)
              return (
                <div key={item.id}>
                  {showGroupHeader && (
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{item.group}</p>
                    </div>
                  )}
                  <label
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      item.required ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={item.required}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
                    />
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{item.label}</span>
                    {item.required && (
                      <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wide">obligatorio</span>
                    )}
                  </label>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <span className="text-sm text-green-600">Cambios guardados. Recargando...</span>
        )}
      </div>
    </div>
  )
}
