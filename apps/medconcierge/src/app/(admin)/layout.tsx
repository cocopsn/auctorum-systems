"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BarChart3, Building2, Key, TrendingUp, Users, ClipboardList,
  Server, Settings, LogOut, Menu, X, Shield,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/api-usage", label: "Consumo API", icon: TrendingUp },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/system", label: "Sistema", icon: Server },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [userName, setUserName] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          setAuthorized(false)
          router.replace("/agenda")
          return null
        }
        setAuthorized(true)
        return r.json()
      })
      .then(d => {
        if (d?.userName) setUserName(d.userName)
      })
      .catch(() => {
        setAuthorized(false)
        router.replace("/agenda")
      })
  }, [router])

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full" />
      </div>
    )
  }

  if (authorized === false) return null

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <Shield className="w-7 h-7 text-teal-400" />
          <div>
            <h1 className="text-sm font-bold tracking-tight">Admin Panel</h1>
            <p className="text-[10px] text-slate-400">AUCTORUM SYSTEMS</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-600/20 text-teal-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50">
          {userName && (
            <p className="text-xs text-slate-400 px-3 mb-2 truncate">{userName}</p>
          )}
          <a
            href="/agenda"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Volver al Dashboard
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-teal-600" />
          <span className="text-sm font-semibold text-slate-800">Admin Panel</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
