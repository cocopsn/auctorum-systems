import type { PortalSection, PortalConfig } from "@quote-engine/db"

interface Props {
  sections: PortalSection[]
  config: PortalConfig
  tenantName: string
}

export function PortalRenderer({ sections, config, tenantName }: Props) {
  const primary = config.colors?.primary || "#2563eb"
  const font = config.font || "Inter"

  const visibleSections = sections
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <div style={{ fontFamily: `${font}, system-ui, sans-serif` }}>
      {visibleSections.map(section => (
        <SectionBlock key={section.id} section={section} primary={primary} tenantName={tenantName} config={config} />
      ))}
    </div>
  )
}

function SectionBlock({ section, primary, tenantName, config }: {
  section: PortalSection; primary: string; tenantName: string; config: PortalConfig
}) {
  switch (section.type) {
    case "hero": return <HeroSection data={section.data} primary={primary} />
    case "about": return <AboutSection data={section.data} />
    case "services": return <ServicesSection data={section.data} primary={primary} />
    case "contact": return <ContactSection data={section.data} primary={primary} tenantName={tenantName} />
    case "cta": return <CtaSection data={section.data} primary={primary} />
    case "faq": return <FaqSection data={section.data} />
    case "testimonials": return <TestimonialsSection data={section.data} />
    case "gallery": return <GallerySection data={section.data} />
    case "team": return <TeamSection data={section.data} />
    default: return null
  }
}

function HeroSection({ data, primary }: { data: any; primary: string }) {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center text-center px-6 py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at center, ${primary}, transparent 70%)` }} />
      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
          {data.headline || "Bienvenido"}
        </h1>
        {data.subheadline && (
          <p className="mt-4 text-lg md:text-xl text-slate-300 max-w-xl mx-auto">{data.subheadline}</p>
        )}
        {data.ctaText && (
          <a href={data.ctaLink || "#"} className="inline-block mt-8 px-8 py-3.5 text-sm font-semibold text-white rounded-full shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: primary }}>
            {data.ctaText}
          </a>
        )}
      </div>
    </section>
  )
}

function AboutSection({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center">{data.title || "Sobre Nosotros"}</h2>
        <p className="mt-6 text-lg text-slate-600 leading-relaxed text-center max-w-2xl mx-auto">{data.description}</p>
        {data.specialties?.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {data.specialties.map((s: string, i: number) => (
              <span key={i} className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{s}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ServicesSection({ data, primary }: { data: any; primary: string }) {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">{data.title || "Servicios"}</h2>
          {data.subtitle && <p className="mt-3 text-slate-600">{data.subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(data.items || []).map((item: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: primary + "15" }}>
                <svg className="w-5 h-5" style={{ color: primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
              {item.price && <p className="mt-3 text-sm font-semibold" style={{ color: primary }}>{item.price}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection({ data, primary, tenantName }: { data: any; primary: string; tenantName: string }) {
  return (
    <section id="contact" className="py-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-slate-900">{data.title || "Contacto"}</h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.phone && (
            <div className="p-6 bg-slate-50 rounded-2xl">
              <p className="text-sm text-slate-500">Telefono</p>
              <a href={`tel:${data.phone}`} className="text-lg font-semibold text-slate-900 hover:underline">{data.phone}</a>
            </div>
          )}
          {data.email && (
            <div className="p-6 bg-slate-50 rounded-2xl">
              <p className="text-sm text-slate-500">Email</p>
              <a href={`mailto:${data.email}`} className="text-lg font-semibold text-slate-900 hover:underline">{data.email}</a>
            </div>
          )}
          {data.address && (
            <div className="p-6 bg-slate-50 rounded-2xl">
              <p className="text-sm text-slate-500">Direccion</p>
              <p className="text-lg font-semibold text-slate-900">{data.address}</p>
            </div>
          )}
        </div>
        {data.whatsapp_link && (
          <a href={data.whatsapp_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 text-sm font-semibold text-white rounded-full transition hover:shadow-lg"
            style={{ backgroundColor: "#25D366" }}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            WhatsApp
          </a>
        )}
      </div>
    </section>
  )
}

function CtaSection({ data, primary }: { data: any; primary: string }) {
  return (
    <section className="py-16 px-6" style={{ backgroundColor: primary }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white">{data.title || "Agende su Cita"}</h2>
        {data.subtitle && <p className="mt-3 text-white/80">{data.subtitle}</p>}
        {data.buttonText && (
          <a href={data.buttonLink || "#"} className="inline-block mt-8 px-8 py-3 text-sm font-semibold rounded-full bg-white hover:shadow-lg transition"
            style={{ color: primary }}>
            {data.buttonText}
          </a>
        )}
      </div>
    </section>
  )
}

function FaqSection({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">{data.title || "FAQ"}</h2>
        <div className="space-y-4">
          {(data.items || []).map((item: any, i: number) => (
            <details key={i} className="group border border-slate-200 rounded-xl">
              <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-semibold text-slate-900">
                {item.question}
                <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <p className="px-4 pb-4 text-sm text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">{data.title || "Testimonios"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(data.items || []).map((item: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: item.rating || 5 }).map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="text-sm text-slate-600 italic">&ldquo;{item.text}&rdquo;</p>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function GallerySection({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">{data.title || "Galeria"}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(data.images || []).map((img: any, i: number) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TeamSection({ data }: { data: any }) {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">{data.title || "Equipo"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(data.members || []).map((m: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
              <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto mb-4 overflow-hidden">
                {m.photo && <img src={m.photo} alt={m.name} className="w-full h-full object-cover" loading="lazy" />}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{m.name}</h3>
              <p className="text-sm text-slate-500">{m.role}</p>
              {m.bio && <p className="mt-2 text-xs text-slate-400">{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
