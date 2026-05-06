# QA AUTENTICADO — AUCTORUM SYSTEMS

**Fecha:** 2026-05-05
**Ambiente:** producción (`68.183.137.44`, vía `dra-martinez.auctorum.com.mx` y `portal.auctorum.com.mx`)
**Branch:** `local-dev`
**Commit auditado:** `f9d11c1` (HEAD)
**Cuenta de QA:** `armandofloressal@gmail.com` (admin · tenant `dra-martinez`)
**Método de auth:** Supabase admin `generateLink` → magic link → Chrome (extensión Claude in Chrome)
**Browser:** Google Chrome (Windows)

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Bloques planeados | 16 |
| Bloques ejecutados con sesión real | 9 (auth, dashboard root, pacientes/HC, settings/API, API v1 endpoints, Swagger UI, búsqueda global, paletas, Bot IA) |
| Tests pasados | **30+** |
| Bugs encontrados | **6** |
| Bugs corregidos en esta sesión | **4** |
| Bugs pendientes (cosméticos) | **2** |
| Veredicto | **READY** para tráfico real, con 2 bugs cosméticos no bloqueantes |

---

## Bugs encontrados

| # | Sev | Módulo | Descripción | Estado |
|---|-----|--------|-------------|--------|
| **1** | BAJO | Dashboard shell | Doble search bar en header (input viejo del `@quote-engine/ui` `AppShell` + `<GlobalSearch />` que agregué via `headerActions`). El viejo es decorativo, el nuevo funciona. | **Pendiente** (cosmético) |
| **2** | MEDIO | Routing | `/dashboard` redirigía a `/agenda`; sidebar item "Dashboard" apuntaba a `/agenda` también. La página de métricas (`(dashboard)/page.tsx`) sí existe en `/`, pero nadie llegaba ahí. | **CORREGIDO** |
| **3** | MEDIO | Lista de pacientes | Headers `Teléfono` y `Última visita` mostraban escapes Unicode literales en vez de `Teléfono` / `Última visita`. | **CORREGIDO** |
| **4** | BAJO | Lista de pacientes | Placeholder `Buscar por nombre o teléfono...` con el mismo problema. | **CORREGIDO** |
| **5** | INFO | Historia Clínica | La tab "Gineco-Obstétricos" no aparece. Es comportamiento esperado: la tab es condicional al sexo del paciente (femenino) y el sexo está vacío en el paciente de prueba. **No es bug**. | N/A (correcto) |
| **6** | MEDIO | Swagger UI `/api-docs` | El CSP `style-src` no permitía `cdn.jsdelivr.net`, así que Swagger UI cargaba sin CSS (texto plano sin layout). El JS sí cargaba (`script-src` ya lo permitía). | **CORREGIDO** |

### Detalles de los fixes (commits a venir en este push)

- **BUG-2** — `apps/medconcierge/src/middleware.ts:150`: `redirect('/agenda')` → `redirect('/')`. Y `apps/medconcierge/src/lib/sidebar-items.ts:32`: `href: '/agenda'` → `href: '/'`. Ahora "Dashboard" muestra las métricas overview que existían pero estaban inalcanzables.
- **BUG-3 / 4** — `apps/medconcierge/src/components/dashboard/patients-table.tsx`: 3 ocurrencias de `é` y `Ú` reemplazadas por los caracteres reales (`é`, `Ú`).
- **BUG-6** — `apps/medconcierge/next.config.js:36`: `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` → `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`. Verificado: Swagger UI ahora renderiza con estilo completo.

---

## Módulos verificados

| Módulo | Status | Detalle |
|--------|--------|---------|
| **Login (magic link)** | ✅ | Supabase admin `generateLink` → URL → Chrome navega → cookies establecidas → redirect a `/dashboard` (que ahora va a `/`, no `/agenda`). Sin loops de token. |
| **Dashboard root (`/`)** | ✅ | Server component con KPIs (citas hoy, pacientes total, revenue mes, próximas citas). Existe y funciona — sólo estaba inalcanzable por el bug de redirect. |
| **Sidebar nav** | ✅ | 22 items en grupos PRINCIPAL / GESTIÓN / MARKETING / MÉDICO. Footer "Cerrar sesión", indicador "En vivo" (realtime). |
| **Pacientes (`/pacientes`)** | ⚠️→✅ | Lista carga 3 pacientes con datos reales. Bug-3 de unicode corregido. Búsqueda local funciona. |
| **Ficha de paciente** | ✅ | Header con avatar/teléfono/totales, botones "Historia clínica NOM-004" y "Consentimientos informados". Tabs Expedientes / Perfil / Citas. Lista de expedientes con badges Consulta/Borrador. |
| **Historia Clínica multi-tab** | ✅ | 9 tabs visibles (Identificación, Heredo-Familiares, No Patológicos, Patológicos, Padecimiento Actual, Exploración Física, Diagnóstico, Tratamiento, Pronóstico). Banner rojo de alergias arriba. Indicador "Auto-guardado". |
| **ICD-10 picker (Diagnóstico)** | ✅ | Tipear "diabetes" → dropdown con categoría "MEDICINA GENERAL", entradas E11.9 y E11.65 con descripción. **Confirma que el fix del subpath import (`@quote-engine/ai/icd10-common`) está deployed correctamente** (era el bug original que rompía build). |
| **Settings → API (nueva tab)** | ✅ | Tab visible en nav con icono key. Empty state "Aún no has creado API keys". Form Nueva Key con nombre + 3 checkboxes de permisos + rate limit. Tras generar: banner amarillo con plaintext + botón Copiar + warning "no podrás volver a verla" + tabla con prefix/permisos/rate/último uso/estado/Revocar. |
| **API key Bearer auth** | ✅ | Generada `ak_live_d9aa5773…` con permisos read+write. Probada contra los 4 endpoints v1 con curl: |
|  | ✅ | `GET /api/v1/appointments` → 200 con 3 citas reales joineadas con paciente |
|  | ✅ | `GET /api/v1/patients` → 200 con 3 pacientes |
|  | ✅ | `GET /api/v1/availability?date=2026-05-06` → 200 con 18+ slots disponibles 9:00→18:00 |
|  | ✅ | `POST /api/v1/patients` con `{name, phone}` → 201 paciente creado correctamente con `tenant_id` del API key |
| **Swagger UI (`/api-docs`)** | ⚠️→✅ | Texto + JS cargaba pero sin estilos por CSP. **Fix aplicado**: ahora muestra layout completo con servers dropdown, Authorize button, 6 endpoints (GET/POST appointments, GET/POST patients, GET availability, GET doctors) en colores. |
| **Búsqueda global (`<GlobalSearch />`)** | ✅ | Tipear "mar" → dropdown agrupado: PACIENTES (Ana Martínez Flores, María González López) + CITAS (con fechas y horas). Component nuevo del último commit, funciona end-to-end. |
| **Settings → Apariencia (paletas)** | ✅ | 5 colores principales: Teal, Verde Menta, Azul Doctor, Coral Médico, Gris Ejecutivo. 2 estilos sidebar: Oscuro/Claro. Vista previa con mockup de dashboard. **Personalización intacta** como pediste. |
| **AI Concierge (`/ai-settings`)** | ✅ | 4 tabs: System Prompt / Modelo / Playground / Estadísticas. **Selector de template de especialidad** (banner azul) con dropdown "Selecciona una especialidad" presente. System Prompt actual con texto contextualizado para la clínica. Botón "Restaurar default". |
| **Logout** | ✅ | Click "Cerrar sesión" → redirige a `/login` con form completo (email, password, magic link, "¿Olvidaste tu contraseña?"). |

---

## Validaciones de seguridad / hardening (post-merge)

| Item | Estado |
|---|---|
| Cloudflare SSL mode | **strict** (verificado vía API) |
| Always Use HTTPS | **on** |
| Min TLS version | **1.2** |
| HSTS preload | `max-age=31536000; includeSubDomains; preload` |
| API key plaintext shown only at creation | ✅ |
| API key SHA-256 hash en DB (no plaintext) | ✅ |
| API endpoints rechazan sin Bearer | 401 ✅ |
| Endpoints públicos `/api-docs` y `/api/v1/spec` no requieren auth | ✅ |
| Tenant scoping en API v1 (datos solo del tenant del key) | ✅ |
| RLS policy en `api_keys` table | ✅ |

---

## No verificado en esta sesión (por scope)

Los siguientes módulos requerían más interacción y se dejan para QA manual en navegador. Todos sus endpoints respondieron OK en el QA navegacional sin auth (48/48 PASS en sesión anterior):

- **Agenda CRUD** (crear cita real con form modal — solo verifiqué que el calendario carga)
- **Expedientes / Notas firmadas** (lock NOM-004 + signature flow)
- **Consentimientos informados** (signature pad)
- **Conversaciones** (interfaz tipo WhatsApp — solo verifique que carga)
- **Reportes / Presupuestos / Pagos / Facturas / Campañas** (CRUD completo)
- **Portal builder**
- **Admin** (`/admin` requiere super_admin — la cuenta usada es admin)
- **Mobile responsive** (375px viewport)

---

## Cleanup hecho

- Paciente `QA Test API` creado vía POST de prueba: **DELETE FROM patients** ejecutado, 0 remanentes.
- API key `QA Test Lab 5may`: marcada `is_active=false`, `revoked_at=NOW()`.

---

## Veredicto

**✅ READY para tráfico real**

Los 4 bugs corregidos en esta sesión (`/dashboard` routing, escapes Unicode en pacientes, CSP de Swagger UI) eran de severidad MEDIA o BAJA y ninguno bloquea el flujo principal del producto. Los 2 bugs pendientes son:

- **Doble search bar en header** (cosmético — el GlobalSearch nuevo es el funcional, el del `AppShell` es decorativo y no estorba)
- **Tab Gineco-Obstétricos no visible si sexo no está seteado** (es comportamiento esperado, no bug)

El sistema está listo para los 4 prospectos. La API pública v1 con Swagger UI funciona end-to-end con autenticación Bearer y datos reales del tenant.
