# CLAUDE.md — Auctorum Systems: Motor de Cotizaciones B2B
# Versión: 3.0 FINAL | Fecha: 2026-03-25
# FUENTE DE VERDAD ABSOLUTA. Lee completo antes de escribir código.

## IDENTIDAD
- **Marca paraguas**: Auctorum — Plataforma de IA Personal Soberana
- **División**: Auctorum Systems — SaaS verticales + páginas web
- **Producto**: Motor de Cotizaciones B2B — portal white-label para proveedores industriales
- **Modelo**: SaaS multi-tenant. UNA base de código, N clientes. Cada cliente = tenant con config JSON.
- **Región**: Saltillo–Ramos Arizpe, Coahuila (clúster automotriz: GM, Stellantis, Magna, Lear)
- **Cliente target**: PyMEs proveedoras Tier 2-3 (empaquetadoras, tarimeras, maquinados CNC, electromecánica)
- **Principio core**: NUNCA crear un proyecto nuevo por cliente. Siempre configurar un nuevo tenant.

## PROPUESTA DE VALOR (lo que vendemos, no lo que construimos)
El Motor de Cotizaciones B2B NO es "un portal de cotizaciones bonito." Es un sistema de 5 capas:

1. **Velocidad competitiva**: El proveedor que cotiza primero gana el 70% de las órdenes. Supplicium le da cotización formal en PDF en 30 segundos vs 2 días manual.

2. **Quote Intelligence**: Tracking en tiempo real de cada cotización. El proveedor sabe CUÁNDO la abrieron, QUIÉN la vio, CUÁNTO tiempo pasó leyéndola. Notificación por WhatsApp: "Tu cotización #42 fue vista por Juan Pérez de Magna hace 3 min."

3. **CRM involuntario**: Cada cotización construye una base de datos de contactos: nombre, empresa, teléfono, email, productos cotizados, montos, frecuencia, tasa de aceptación. En 6 meses el proveedor tiene su cartera de clientes digitalizada sin haber hecho nada.

4. **Presencia digital**: El 53% de los negocios industriales de Saltillo NO tienen página web. El portal del tenant ES su presencia en internet. Su dominio, su marca, indexable en Google.

5. **Seguimiento automático**: Cotizaciones no abiertas en 48hrs reciben recordatorio por WhatsApp. Cotizaciones por vencer reciben alerta. Ninguna cotización se queda sin respuesta.

## STACK TECNOLÓGICO
- **Runtime**: Node.js 20 LTS
- **Framework**: Next.js 14+ (App Router, RSC)
- **Styling**: Tailwind CSS 3.4+
- **DB**: PostgreSQL via Supabase (RLS habilitado)
- **ORM**: Drizzle ORM (type-safe, migraciones SQL)
- **PDF**: @react-pdf/renderer (server-side)
- **WhatsApp**: Meta WhatsApp Cloud API
- **Email**: Resend + React Email
- **Auth**: Supabase Auth (magic link)
- **Storage**: Supabase Storage
- **Validation**: zod
- **Deploy**: VPS Ubuntu 24.04 + PM2 + Nginx + Let's Encrypt wildcard
- **Package manager**: pnpm workspace monorepo

## ARQUITECTURA MULTI-TENANT

### Resolución por subdominio
1. Middleware extrae subdominio del Host header
2. Busca tenant en DB por slug (cached con React cache())
3. Inyecta x-tenant-slug header
4. Queries filtran por tenant_id + RLS en Supabase

### Config JSON por tenant
```json
{
  "slug": "toolroom",
  "name": "Tool Room Maquinados",
  "logo_url": "https://storage.../toolroom/logo.png",
  "colors": {
    "primary": "#1B3A5C",
    "secondary": "#C0392B",
    "accent": "#E67E22",
    "background": "#FFFFFF"
  },
  "contact": {
    "phone": "844 416 2555",
    "email": "ventas@toolroom.com",
    "whatsapp": "528441234567",
    "address": "Parque Industrial X, Nave 12, Saltillo"
  },
  "business": {
    "razon_social": "Tool Room Maquinados S.A. de C.V.",
    "rfc": "TRM123456ABC",
    "giro": "Maquinados CNC de precisión"
  },
  "quote_settings": {
    "currency": "MXN",
    "tax_rate": 0.16,
    "validity_days": 15,
    "auto_number_prefix": "COT",
    "payment_terms": "50% anticipo, 50% contra entrega",
    "delivery_terms": "3-5 días hábiles",
    "custom_footer": "Precios sujetos a cambio sin previo aviso.",
    "show_sku": true,
    "show_images_in_pdf": false
  },
  "notifications": {
    "whatsapp_on_new_quote": true,
    "email_on_new_quote": true,
    "notify_on_quote_viewed": true,
    "auto_reminder_hours": 48
  },
  "features": {
    "quote_tracking": true,
    "quote_expiration_alerts": true,
    "client_directory": true
  }
}
```

## SCHEMA DE BASE DE DATOS

### tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  plan VARCHAR(20) DEFAULT 'basico',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  unit_price DECIMAL(12,2) NOT NULL,
  unit_type VARCHAR(50) DEFAULT 'pieza',
  image_url TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_tenant ON products(tenant_id) WHERE is_active = true;
```

### quotes
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number SERIAL,
  tracking_token VARCHAR(32) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_company VARCHAR(255),
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0.1600,
  tax_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_status ON quotes(tenant_id, status);
CREATE INDEX idx_quotes_tracking ON quotes(tracking_token);
```

### quote_items
```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_type VARCHAR(50),
  line_total DECIMAL(12,2) NOT NULL
);
```

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### quote_events
```sql
CREATE TABLE quote_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(30) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_events_quote ON quote_events(quote_id);
CREATE INDEX idx_events_tenant ON quote_events(tenant_id);
```

### clients (CRM involuntario — V2)
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  total_quotes INTEGER DEFAULT 0,
  total_quoted_amount DECIMAL(14,2) DEFAULT 0,
  total_accepted INTEGER DEFAULT 0,
  total_accepted_amount DECIMAL(14,2) DEFAULT 0,
  last_quote_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone)
);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
```

## FEATURES POR FASE

### MVP (construir AHORA — pasos 1-14)
1. Schema DB + migraciones + seed (tenant demo + 10 productos CNC)
2. Middleware multi-tenant (subdominio a tenant)
3. Portal público: catálogo grid + carrito interactivo + totales en tiempo real
4. Formulario de cotización (validación zod)
5. API POST /api/quotes (core endpoint: validar, calcular, insertar, PDF, notify)
6. Generación de PDF profesional (React-PDF, branding tenant)
7. Envío WhatsApp (doble: al cliente + al proveedor)
8. Envío email (Resend con PDF adjunto)
9. Dashboard: overview + métricas + tabla cotizaciones
10. Dashboard: CRUD productos (agregar, editar, foto, activar/desactivar)
11. Dashboard: settings tenant (logo, colores, contacto, términos)
12. Auth Supabase (magic link)
13. Script create-tenant.sh (DB + DNS + SSL)
14. Deploy VPS + PM2 + Nginx

### V2 — Quote Intelligence (semana 3-4)
15. Quote tracking: URL pública /q/[token], registrar apertura + tiempo en página
16. Notificación tiempo real: "Cotización vista por X hace 5 min" (WhatsApp al proveedor)
17. Status pipeline visual: generated > sent > viewed > accepted/rejected/expired
18. Dashboard analytics: tasa conversión, tiempo respuesta, top productos cotizados
19. Cotizaciones expiradas: cron que marca vencidas + alerta al proveedor
20. Recordatorios automáticos: 48hrs sin abrir > reenviar WhatsApp
21. Tabla clients: CRM involuntario, historial por empresa, total cotizado, tasa cierre
22. Dashboard: directorio de clientes con métricas por empresa

### V3 — Growth (mes 2+)
23. Duplicar cotizaciones (recurrentes)
24. Landing SEO por tenant (indexable en Google)
25. Firma digital de aceptación
26. Pagos parciales (Stripe/Conekta)
27. Multi-moneda (USD/MXN)
28. Approval workflows
29. API pública / embed widget
30. White-label enterprise (quitar branding Auctorum)
31. Export a Excel
32. Webhooks salientes

## FLUJO CORE

```
toolroom.auctorum.com.mx
> Catálogo (grid productos + carrito)
> "Generar cotización"
> Formulario (nombre, empresa, teléfono, email)
> POST /api/quotes
  > Validar tenant + productos + datos (zod)
  > Calcular subtotal + IVA + total (server-side, NUNCA confiar en frontend)
  > INSERT quote + quote_items (transacción)
  > Upsert client en tabla clients (CRM involuntario)
  > Generar PDF (React-PDF, logo + tabla + totales + términos)
  > Upload PDF a Supabase Storage
  > INSERT quote_event (created)
  > WhatsApp al cliente (link descarga + link tracking)
  > WhatsApp al proveedor (datos del lead + monto)
  > Email al cliente (PDF adjunto)
  > UPDATE status = 'sent', sent_at = now(), expires_at = now() + validity_days
> Pantalla éxito + link descarga PDF
```

## REGLAS ABSOLUTAS

### NUNCA
- Hardcodear datos de cliente en código
- Crear proyecto/rama/carpeta por cliente
- Duplicar componentes por tenant
- CSS inline para colores de tenant (usar CSS variables)
- Secrets en código (env vars siempre)
- Calcular totales solo en frontend (recalcular en API)
- Exponer tenant_id al público (usar slug y tracking_token)
- DELETE real en productos o cotizaciones (soft delete siempre)

### SIEMPRE
- Resolver tenant desde subdominio en middleware
- Filtrar queries por tenant_id
- CSS variables para branding (--tenant-primary, --tenant-secondary)
- PDFs server-side con React-PDF
- Validar con zod antes de tocar DB
- Transacciones para quote + items + client upsert
- Registrar quote_events para todo
- Intl.NumberFormat('es-MX') para moneda
- Sanitizar teléfonos antes de WhatsApp (limpiar a solo dígitos, agregar +52)
- Empty states con CTAs en toda la UI
- Loading states en cada botón de acción
- try/catch en cada API route con log + respuesta genérica al usuario

## CONVENCIONES
- TypeScript estricto. No any.
- kebab-case rutas, PascalCase componentes.
- @/ para app, @quote-engine/ para packages.
- Server Components default. 'use client' solo con estado/efectos.
- API: NextResponse.json({ success, data }) o { error }.
- Commits: conventional (feat:, fix:, chore:).

## BRANDING AUCTORUM SYSTEMS
- El footer de cada portal dice: "Powered by Auctorum Systems"
- El dashboard tiene el logo de Auctorum Systems en el sidebar (pequeño, profesional)
- La landing page principal del dominio (sin subdominio) es la landing de Auctorum Systems
- Los PDFs de cotización NO llevan branding de Auctorum (son 100% marca del tenant)
- El plan Enterprise permite quitar el "Powered by" del footer

## ORDEN DE CONSTRUCCIÓN (EJECUTAR EN SECUENCIA)
1. pnpm install
2. Crear drizzle.config.ts + postcss.config.js si no existen
3. Migraciones DB (6 tablas + clients)
4. Seed (tenant demo + 10 productos CNC)
5. Portal público (catálogo + carrito)
6. API /api/quotes (endpoint core)
7. PDF generation
8. WhatsApp integration
9. Email integration
10. Dashboard + auth (magic link)
11. CRUD productos
12. Settings tenant
13. Client upsert en el flujo de cotización (CRM involuntario)
14. Quote tracking (URL pública + eventos + notificación)
15. Recordatorios automáticos (cron 48hrs)
16. Dashboard analytics (conversión, productos top, clientes top)
17. Directorio de clientes en dashboard
18. SEO: metadata dinámica + JSON-LD por tenant
19. Test E2E completo
20. Deploy VPS

## CHECKLIST DE VALIDACIÓN FINAL
- [ ] Portal carga con productos del tenant demo
- [ ] Carrito funciona con totales en tiempo real
- [ ] Formulario valida campos requeridos
- [ ] Cotización se crea en DB con items + client upsert
- [ ] PDF se genera con logo, tabla, totales correctos
- [ ] WhatsApp se envía (o se loguea si token de prueba)
- [ ] Email se envía (o se loguea si no hay Resend key)
- [ ] Dashboard muestra métricas y cotizaciones
- [ ] CRUD productos funciona (crear, editar, subir imagen, desactivar)
- [ ] Settings permite cambiar logo, colores, contacto, términos
- [ ] Quote tracking registra apertura y notifica al proveedor
- [ ] Directorio de clientes muestra historial por empresa
- [ ] Todo responsive en móvil (375px, 768px, 1280px)
- [ ] Zero errores TypeScript
- [ ] Zero errores en consola del browser
- [ ] Footer dice "Powered by Auctorum Systems"
