'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Calendar, Loader2 } from 'lucide-react'

type SearchResult = {
  type: 'patient' | 'appointment'
  id: string
  title: string
  subtitle: string
  url: string
}

type SearchResponse = {
  results: {
    patients: SearchResult[]
    appointments: SearchResult[]
  }
}

/**
 * Global header search.
 *
 * Debounced live dropdown across patients + appointments. Falls back to
 * `/pacientes?search=<q>` on Enter when no result is selected.
 */
export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse['results'] | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function onChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/dashboard/search?q=${encodeURIComponent(value.trim())}`,
        )
        if (!res.ok) {
          setResults({ patients: [], appointments: [] })
        } else {
          const data: SearchResponse = await res.json()
          setResults(data.results)
        }
        setOpen(true)
      } catch {
        setResults({ patients: [], appointments: [] })
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function onSelect(url: string) {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(url)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      e.preventDefault()
      // If there are results, pick the first; otherwise fall back to patients page
      const first = results?.patients?.[0] ?? results?.appointments?.[0]
      if (first) onSelect(first.url)
      else router.push(`/pacientes?search=${encodeURIComponent(query.trim())}`)
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hasResults =
    !!results &&
    (results.patients.length > 0 || results.appointments.length > 0)

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results && setOpen(true)}
          placeholder="Buscar pacientes, citas..."
          aria-label="Búsqueda global"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary,#0d9488)]"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {!hasResults && !loading && (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {results && results.patients.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pacientes
              </div>
              {results.patients.map((r) => (
                <button
                  key={`p-${r.id}`}
                  type="button"
                  onClick={() => onSelect(r.url)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-[var(--theme-primary,#0d9488)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {r.title}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {r.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && results.appointments.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Citas
              </div>
              {results.appointments.map((r) => (
                <button
                  key={`a-${r.id}`}
                  type="button"
                  onClick={() => onSelect(r.url)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {r.title}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {r.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
