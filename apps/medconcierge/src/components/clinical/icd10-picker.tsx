'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { searchIcd10, findIcd10ByCode, type Icd10Entry } from '@quote-engine/ai'

/**
 * ICD-10 picker — debounced search across the common-codes catalog.
 * Renders matches grouped by category.
 *
 * Value contract:
 *   value = the ICD-10 code (string), e.g. "K02.9"
 *   onChange(code, description) — called when user picks an entry
 */
export function Icd10Picker({
  value,
  onChange,
  placeholder = 'Buscar diagnóstico CIE-10…',
  disabled,
}: {
  value: string | null | undefined
  onChange: (code: string | null, description: string | null) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => (value ? findIcd10ByCode(value) : undefined), [value])
  const results = useMemo<Icd10Entry[]>(() => searchIcd10(query, 15), [query])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Group by category for display
  const grouped = useMemo(() => {
    const map = new Map<string, Icd10Entry[]>()
    for (const r of results) {
      const arr = map.get(r.category) ?? []
      arr.push(r)
      map.set(r.category, arr)
    }
    return Array.from(map.entries())
  }, [results])

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Selected pill */}
      {selected && !open ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <span className="font-mono text-xs font-semibold text-gray-900">{selected.code}</span>
          <span className="text-sm text-gray-700 truncate flex-1">{selected.description}</span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                cambiar
              </button>
              <button
                type="button"
                onClick={() => onChange(null, null)}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
                aria-label="Quitar diagnóstico"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-colors disabled:bg-gray-50"
          />
        </div>
      )}

      {/* Dropdown */}
      {open && (query.trim().length > 0) && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-400">
              Sin resultados. Intenta otro término o introduce el código manualmente.
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  {category}
                </div>
                {items.map((it) => (
                  <button
                    key={it.code}
                    type="button"
                    onClick={() => {
                      onChange(it.code, it.description)
                      setOpen(false)
                      setQuery('')
                    }}
                    className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-mono text-xs font-semibold text-blue-600 mt-0.5 shrink-0">
                      {it.code}
                    </span>
                    <span className="text-sm text-gray-700 leading-tight">{it.description}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
