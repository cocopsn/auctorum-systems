"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Plus, Eye, EyeOff, Trash2, GripVertical, Save, Globe, Palette } from "lucide-react"

type Section = {
  id: string
  type: string
  visible: boolean
  order: number
  data: Record<string, any>
}

const SECTION_TYPES = [
  { type: "hero", label: "Hero Banner" },
  { type: "about", label: "Sobre el Doctor" },
  { type: "services", label: "Servicios" },
  { type: "gallery", label: "Galeria" },
  { type: "testimonials", label: "Testimonios" },
  { type: "team", label: "Equipo" },
  { type: "faq", label: "Preguntas Frecuentes" },
  { type: "contact", label: "Contacto" },
  { type: "cta", label: "Call to Action" },
]

export default function PortalEditorPage() {
  const [portal, setPortal] = useState<any>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [config, setConfig] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"sections" | "config">("sections")
  const [editingSection, setEditingSection] = useState<Section | null>(null)

  const fetchPortal = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/portal")
      if (res.ok) {
        const json = await res.json()
        setPortal(json.portal)
        setSections((json.portal?.sections as Section[]) || [])
        setConfig(json.config || {})
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPortal() }, [fetchPortal])

  async function saveConfig() {
    setSaving(true)
    await fetch("/api/dashboard/portal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    setSaving(false)
  }

  async function addSection(type: string) {
    setSaving(true)
    const res = await fetch("/api/dashboard/portal/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, visible: true, data: getDefaultData(type) }),
    })
    if (res.ok) {
      await fetchPortal()
    }
    setSaving(false)
  }

  async function updateSection(id: string, data: any) {
    setSaving(true)
    await fetch(`/api/dashboard/portal/sections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    await fetchPortal()
    setSaving(false)
  }

  async function deleteSection(id: string) {
    if (!confirm("Eliminar esta seccion?")) return
    setSaving(true)
    await fetch(`/api/dashboard/portal/sections/${id}`, { method: "DELETE" })
    await fetchPortal()
    setEditingSection(null)
    setSaving(false)
  }

  async function toggleVisibility(id: string, visible: boolean) {
    await updateSection(id, { visible })
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Portal del Doctor</h1>
          <p className="mt-1 text-sm text-gray-500">Personaliza tu pagina web publica.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveConfig} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        <button onClick={() => setActiveTab("sections")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition ${activeTab === "sections" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          <Globe className="w-4 h-4" /> Secciones
        </button>
        <button onClick={() => setActiveTab("config")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition ${activeTab === "config" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          <Palette className="w-4 h-4" /> Configuracion
        </button>
      </div>

      {activeTab === "sections" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Secciones ({sections.length})</h3>
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                  <Plus className="w-3 h-3" /> Agregar
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {SECTION_TYPES.map(t => (
                    <button key={t.type} onClick={() => addSection(t.type)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {sections.sort((a, b) => a.order - b.order).map(section => (
              <div key={section.id}
                className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition cursor-pointer ${editingSection?.id === section.id ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"}`}
                onClick={() => setEditingSection(section)}>
                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">{section.type.replace("_", " ")}</p>
                  <p className="text-xs text-gray-400 truncate">{section.data?.title || section.data?.headline || "Sin titulo"}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleVisibility(section.id, !section.visible) }}
                  className={`p-1.5 rounded-lg ${section.visible ? "text-blue-600 bg-blue-50" : "text-gray-400 bg-gray-100"}`}>
                  {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={e => { e.stopPropagation(); deleteSection(section.id) }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Section editor */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {editingSection ? (
              <SectionEditor section={editingSection} onSave={(data) => {
                updateSection(editingSection.id, { data })
                setEditingSection({ ...editingSection, data })
              }} />
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-gray-400">
                Selecciona una seccion para editar
              </div>
            )}
          </div>
        </div>
      ) : (
        <PortalConfigEditor config={config} setConfig={setConfig} saving={saving} onSave={saveConfig} />
      )}
    </div>
  )
}

function SectionEditor({ section, onSave }: { section: Section; onSave: (data: any) => void }) {
  const [data, setData] = useState(section.data)

  useEffect(() => { setData(section.data) }, [section])

  function update(key: string, value: any) {
    const updated = { ...data, [key]: value }
    setData(updated)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 capitalize">{section.type.replace("_", " ")}</h3>

      {/* Generic field rendering based on section type */}
      {section.type === "hero" && (
        <>
          <Field label="Titulo" value={data.headline || ""} onChange={v => update("headline", v)} />
          <Field label="Subtitulo" value={data.subheadline || ""} onChange={v => update("subheadline", v)} />
          <Field label="Texto del boton" value={data.ctaText || ""} onChange={v => update("ctaText", v)} />
          <Field label="Link del boton" value={data.ctaLink || ""} onChange={v => update("ctaLink", v)} />
        </>
      )}
      {section.type === "about" && (
        <>
          <Field label="Titulo" value={data.title || ""} onChange={v => update("title", v)} />
          <TextArea label="Descripcion" value={data.description || ""} onChange={v => update("description", v)} />
        </>
      )}
      {section.type === "services" && (
        <>
          <Field label="Titulo" value={data.title || ""} onChange={v => update("title", v)} />
          <Field label="Subtitulo" value={data.subtitle || ""} onChange={v => update("subtitle", v)} />
          <p className="text-xs text-gray-500">Servicios: {(data.items || []).length} configurados</p>
        </>
      )}
      {section.type === "contact" && (
        <>
          <Field label="Titulo" value={data.title || ""} onChange={v => update("title", v)} />
          <Field label="Telefono" value={data.phone || ""} onChange={v => update("phone", v)} />
          <Field label="Email" value={data.email || ""} onChange={v => update("email", v)} />
          <Field label="Direccion" value={data.address || ""} onChange={v => update("address", v)} />
          <Field label="WhatsApp Link" value={data.whatsapp_link || ""} onChange={v => update("whatsapp_link", v)} />
        </>
      )}
      {section.type === "cta" && (
        <>
          <Field label="Titulo" value={data.title || ""} onChange={v => update("title", v)} />
          <Field label="Subtitulo" value={data.subtitle || ""} onChange={v => update("subtitle", v)} />
          <Field label="Texto del boton" value={data.buttonText || ""} onChange={v => update("buttonText", v)} />
          <Field label="Link del boton" value={data.buttonLink || ""} onChange={v => update("buttonLink", v)} />
        </>
      )}
      {section.type === "faq" && (
        <>
          <Field label="Titulo" value={data.title || ""} onChange={v => update("title", v)} />
          <p className="text-xs text-gray-500">Preguntas: {(data.items || []).length} configuradas</p>
        </>
      )}
      {(section.type === "gallery" || section.type === "testimonials" || section.type === "team") && (
        <>
          <Field label="Titulo" value={data.title || ""} onChange={v => update("title", v)} />
          <p className="text-xs text-gray-500">Items: {(data.items || data.images || data.members || []).length}</p>
        </>
      )}

      <button onClick={() => onSave(data)}
        className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
        Guardar Seccion
      </button>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
    </label>
  )
}

function PortalConfigEditor({ config, setConfig, saving, onSave }: { config: any; setConfig: (c: any) => void; saving: boolean; onSave: () => void }) {
  function update(path: string, value: any) {
    const parts = path.split(".")
    const updated = { ...config }
    let obj = updated
    for (let i = 0; i < parts.length - 1; i++) {
      obj[parts[i]] = { ...(obj[parts[i]] || {}) }
      obj = obj[parts[i]]
    }
    obj[parts[parts.length - 1]] = value
    setConfig(updated)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <h3 className="text-base font-semibold text-gray-900">Configuracion Global</h3>

      <Field label="Nombre del consultorio" value={config.businessName || ""} onChange={v => update("businessName", v)} />

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Paleta de Colores</p>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Primario</span>
            <input type="color" value={config.colors?.primary || "#2563eb"} onChange={e => update("colors.primary", e.target.value)}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Secundario</span>
            <input type="color" value={config.colors?.secondary || "#1e293b"} onChange={e => update("colors.secondary", e.target.value)}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Acento</span>
            <input type="color" value={config.colors?.accent || "#3b82f6"} onChange={e => update("colors.accent", e.target.value)}
              className="mt-1 w-full h-10 rounded-lg cursor-pointer" />
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Tipografia</p>
        <select value={config.font || "Inter"} onChange={e => update("font", e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="Inter">Inter</option>
          <option value="Poppins">Poppins</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="Raleway">Raleway</option>
        </select>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">SEO</p>
        <div className="space-y-2">
          <Field label="Titulo SEO" value={config.seo?.title || ""} onChange={v => update("seo.title", v)} />
          <TextArea label="Descripcion SEO" value={config.seo?.description || ""} onChange={v => update("seo.description", v)} />
        </div>
      </div>

      <button onClick={onSave} disabled={saving}
        className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar Configuracion"}
      </button>
    </div>
  )
}

function getDefaultData(type: string): Record<string, any> {
  const defaults: Record<string, any> = {
    hero: { headline: "Titulo del Hero", subheadline: "Subtitulo descriptivo", ctaText: "Agendar Cita", ctaLink: "#contact" },
    about: { title: "Sobre Nosotros", description: "Descripcion del consultorio" },
    services: { title: "Servicios", subtitle: "Lo que ofrecemos", items: [] },
    gallery: { title: "Galeria", images: [] },
    testimonials: { title: "Testimonios", items: [] },
    team: { title: "Nuestro Equipo", members: [] },
    faq: { title: "Preguntas Frecuentes", items: [] },
    contact: { title: "Contacto", phone: "", email: "", address: "" },
    cta: { title: "Agende su Cita", subtitle: "", buttonText: "Contactar", buttonLink: "#" },
  }
  return defaults[type] || {}
}
