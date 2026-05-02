'use client'

import { useState, useEffect } from 'react'
import {
  DASHBOARD_THEMES,
  type ThemeKey,
  type ColorFamily,
  type Variant,
  COLOR_FAMILIES,
  colorFamilyName,
  getColorFamily,
  getVariant,
  buildThemeKey,
} from '@/lib/dashboard-themes'
import { ALL_SIDEBAR_ITEMS } from '@/lib/sidebar-items'

export default function AppearancePage() {
  const [theme, setTheme] = useState<ThemeKey>('teal-default')
  const [sidebarItems, setSidebarItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Derived selections from current theme key
  const family: ColorFamily = getColorFamily(theme)
  const variant: Variant = getVariant(theme)

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
        setTimeout(() => window.location.reload(), 500)
      }
    } finally {
      setSaving(false)
    }
  }

  function pickFamily(f: ColorFamily) {
    setTheme(buildThemeKey(f, variant))
  }
  function pickVariant(v: Variant) {
    setTheme(buildThemeKey(family, v))
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

  const t = DASHBOARD_THEMES[theme]

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Personaliza tu Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Elige un color de marca y un estilo de barra lateral. Los cambios se aplican al recargar.
        </p>
      </div>

      {/* Color picker */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Color principal</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {COLOR_FAMILIES.map((f) => {
            const previewKey = buildThemeKey(f, variant)
            const previewTheme = DASHBOARD_THEMES[previewKey]
            const isActive = family === f
            return (
              <button
                key={f}
                onClick={() => pickFamily(f)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                  isActive
                    ? 'border-gray-900 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: previewTheme.swatch }}
                  />
                  <div
                    className="w-4 h-4 rounded border border-gray-200"
                    style={{ backgroundColor: previewTheme.sidebar }}
                  />
                </div>
                <p className="text-xs font-medium text-gray-700">{colorFamilyName(f)}</p>
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sidebar variant picker */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Estilo de barra lateral</h3>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {(['dark', 'light'] as Variant[]).map((v) => {
            const previewKey = buildThemeKey(family, v)
            const previewTheme = DASHBOARD_THEMES[previewKey]
            const isActive = variant === v
            return (
              <button
                key={v}
                onClick={() => pickVariant(v)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? 'border-gray-900 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-12 rounded border"
                    style={{
                      backgroundColor: previewTheme.sidebar,
                      borderColor: previewTheme.sidebarBorder,
                    }}
                  >
                    <div
                      className="w-full h-3 rounded-t flex items-center px-1"
                      style={{ backgroundColor: previewTheme.sidebarBorder }}
                    >
                      <div
                        className="h-1 w-3 rounded"
                        style={{ backgroundColor: previewTheme.sidebarForeground }}
                      />
                    </div>
                    <div className="px-1 pt-1.5 space-y-1">
                      <div
                        className="h-1 w-5 rounded"
                        style={{ backgroundColor: previewTheme.sidebarActive, opacity: 0.9 }}
                      />
                      <div
                        className="h-1 w-4 rounded"
                        style={{ backgroundColor: previewTheme.sidebarText, opacity: 0.6 }}
                      />
                      <div
                        className="h-1 w-4 rounded"
                        style={{ backgroundColor: previewTheme.sidebarText, opacity: 0.6 }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {v === 'dark' ? 'Oscuro' : 'Claro'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {v === 'dark' ? 'Sidebar institucional' : 'Sidebar minimalista'}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Vista previa</h3>
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm flex h-44">
          <div
            className="w-48 p-3 flex flex-col gap-1"
            style={{ backgroundColor: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}` }}
          >
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: t.sidebarActive }} />
              <div className="h-2 w-16 rounded" style={{ backgroundColor: t.sidebarForeground, opacity: 0.85 }} />
            </div>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md"
                style={i === 1 ? {
                  backgroundColor: t.sidebarActiveBg,
                  borderLeft: `2px solid ${t.sidebarActive}`,
                } : {}}
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: i === 1 ? t.sidebarActive : t.sidebarText,
                    opacity: 0.8,
                  }}
                />
                <div
                  className="h-1.5 w-12 rounded"
                  style={{
                    backgroundColor: i === 1 ? t.sidebarActiveFg : t.sidebarText,
                    opacity: i === 1 ? 0.95 : 0.55,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex-1 bg-gradient-to-br from-white via-[#FAFBFC] to-[#F9FAFB] p-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 h-full shadow-sm">
              <div className="h-2 w-24 rounded mb-2" style={{ backgroundColor: t.primary, opacity: 0.7 }} />
              <div className="h-1.5 w-36 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-8 w-16 rounded" style={{ backgroundColor: t.primaryLight }} />
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
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
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
