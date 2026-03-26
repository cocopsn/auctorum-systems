# CLAUDE.md — Auctorum Systems

## Proyecto
Monorepo con 2 apps Next.js 14 + paquetes compartidos:
- `apps/web/` — Motor de Cotizaciones B2B (puerto 3000, dominio: auctorum.com.mx / demo.auctorum.com.mx)
- `apps/medconcierge/` — Concierge AI Medico (puerto 3001, dominio: dra-martinez.auctorum.com.mx)
- `packages/db/` — Drizzle ORM schema + migraciones (Supabase PostgreSQL)
- `packages/pdf/` — Generacion PDF con @react-pdf/renderer
- `packages/notifications/` — WhatsApp Cloud API + Resend email

## Identidad de Marca
- **Auctorum**: Plataforma de IA personal soberana (proyecto core, open source)
- **Auctorum Systems**: SaaS verticales (Motor B2B + Concierge Medico)
- **Auctorum Dev**: Desarrollo a medida, consultoria
- Tagline: "Privacidad. Control. Autoria."
- BDFL: Armando Flores, Saltillo, Coahuila, MX

## Paleta de Colores
- Fondo: #050508 | Superficie: #0a0a10, #101018, #16161f | Bordes: #1e1e2e
- Texto body: #c8c8d4 | Texto light: #e8e8f0 | Texto white: #f4f4f8
- Azul primario: #2d7aff | Azul brillante: #5c9aff | Glow: #2d7aff40
- Cyan: #00d4ff | Purpura: #8b5cf6 | Verde: #10b981

## Tipografia
- Display: Instrument Serif (italic, elegante)
- Body: Sora (moderna, limpia)
- Mono: JetBrains Mono (tecnica)

## Stack
- Next.js 14, React 18, TypeScript 5.4
- Tailwind CSS 3.4, CSS variables para colores de tenant
- Drizzle ORM + Supabase PostgreSQL (IPv6 directo, NO pooler)
- PM2 en VPS DigitalOcean (164.92.84.127)
- Resend para email, WhatsApp Cloud API para notificaciones

## Arquitectura Multi-Tenant
- Middleware extrae subdominio del hostname
- Rutas publicas se reescriben a /[tenant]/
- Header x-tenant-slug se inyecta en cada request
- SIEMPRE filtrar queries por tenant_id
- CSS variables para colores de tenant (--tenant-primary, --tenant-secondary)

## Reglas Absolutas
- NUNCA commitear .env.local, secrets, passwords, ni API keys
- NUNCA usar output: 'standalone' en next.config.js (incompatible con next start)
- NUNCA hacer DELETE real en DB (soft delete siempre)
- NUNCA instalar Cloudflare WARP en el VPS
- SIEMPRE verificar pnpm build ANTES de push
- SIEMPRE resolver tenant desde subdominio en middleware
- SIEMPRE filtrar queries por tenant_id
- SIEMPRE usar CSS variables para colores de tenant
- SIEMPRE agregar try/catch en API routes
- SIEMPRE usar zod para validacion de inputs
- PM2 script path: node_modules/next/dist/bin/next (NO node_modules/.bin/next)

## Flujo de Deploy
1. pnpm build (verificar 0 errores)
2. git add + commit + push
3. SSH al VPS -> cd /opt/auctorum-systems/repo
4. git pull && pnpm install && pnpm build
5. pm2 restart all && pm2 save
6. Verificar https://auctorum.com.mx y https://demo.auctorum.com.mx

## Comandos Utiles
```bash
pnpm dev:web        # Dev Motor B2B (puerto 3000)
pnpm dev:med        # Dev Concierge (puerto 3001)
pnpm build:web      # Build solo web
pnpm build:med      # Build solo medconcierge
pnpm build          # Build ambas apps
pnpm db:generate    # Generar migraciones Drizzle
pnpm db:migrate     # Ejecutar migraciones
```
