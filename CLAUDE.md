# CLAUDE.md — Auctorum

## Proyecto
Monorepo Next.js 14 · 2 apps + paquetes compartidos.
```
apps/web/           → Landing + Motor B2B (puerto 3000)
apps/medconcierge/  → Concierge Médico (puerto 3001)
packages/db/        → Drizzle ORM + Supabase PostgreSQL
packages/pdf/       → @react-pdf/renderer
packages/notifications/ → WhatsApp Cloud API + Resend
```

## Comandos
```bash
pnpm build            # Build ambas apps (OBLIGATORIO antes de push)
pnpm build:web        # Build solo web
pnpm build:med        # Build solo medconcierge
pnpm dev:web          # Dev B2B :3000
pnpm dev:med          # Dev Concierge :3001
```

## Stack
Next.js 14, React 18, TypeScript 5.4, Tailwind 3.4, Drizzle ORM,
Supabase PostgreSQL (IPv6 directo, NO pooler), PM2, Resend, WhatsApp Cloud API.

## Arquitectura Multi-Tenant
Middleware extrae subdominio → header `x-tenant-slug` → rewrite a /[tenant]/.
SIEMPRE filtrar queries por tenant_id. CSS variables: --tenant-primary, --tenant-secondary.
IMPORTANTE: /systems y /platform son rutas estáticas, NO tenants. El middleware DEBE excluirlas.

## Reglas Absolutas
- NUNCA commitear .env.local, secrets, passwords, API keys
- NUNCA usar `output: 'standalone'` en next.config.js
- NUNCA hacer DELETE real en DB — soft delete siempre
- SIEMPRE verificar `pnpm build` pasa ANTES de commit/push
- SIEMPRE usar zod para validación de inputs en API routes
- SIEMPRE agregar try/catch en API routes
- PM2 script path: `node_modules/next/dist/bin/next` (NO `.bin/next`)

## Referencia — Lee ANTES de trabajar en un dominio
- @agent_docs/brand-identity.md — Identidad, paleta, tipografía, estructura de landing y subpáginas
- @agent_docs/deploy-guide.md — VPS, Nginx, PM2, SSL, DNS, flujo de deploy
- @agent_docs/credentials.md — Credenciales (NUNCA commitear, ya en .gitignore)

## Orquestación
Cuando una tarea toca múltiples dominios, delega con subagentes paralelos:
- Frontend: components, Tailwind, animaciones, responsive
- Backend: API routes, DB, validación, webhooks
- Config: next.config, tailwind.config, globals.css, layout.tsx
Cada subagente trabaja aislado. El agente principal verifica conflictos y hace build final.
