# PWA — Auctorum Med

`med.auctorum.com.mx` es una **Progressive Web App** instalable. La misma
aplicación Next.js sirve:
- la landing pública del producto,
- el flujo de signup/login,
- y el dashboard de medconcierge — que el doctor puede instalar como app
  en su celular (Android / iOS 16.4+) o desktop, con notificaciones push,
  ícono en home screen y operación standalone (sin chrome del browser).

Este documento explica cómo está armado, qué tocar para extenderlo, y cómo
verificar que un cambio no rompió la instalabilidad.

## Componentes

```
apps/medconcierge/
├── public/
│   ├── manifest.json                # nombre, íconos, shortcuts, theme color
│   ├── sw.js                        # service worker
│   ├── apple-touch-icon.png         # 180×180, iOS home screen
│   └── icons/
│       ├── icon-72.png ... icon-512.png         # 8 tamaños "any"
│       ├── icon-192-maskable.png                # safe-zone para Android
│       └── icon-512-maskable.png
├── src/
│   ├── app/
│   │   ├── layout.tsx               # meta tags PWA + registro del SW
│   │   └── api/dashboard/push/subscribe/route.ts   # POST/DELETE
│   ├── components/
│   │   ├── install-prompt.tsx       # banner "Instalar app"
│   │   ├── push-bootstrap.tsx       # pide permiso de push (lazy)
│   │   └── dashboard/dashboard-shell.tsx   # monta los 2 anteriores
│   ├── lib/
│   │   ├── push-client.ts           # ensurePushSubscription
│   │   └── notify-doctor.ts         # fan-out Expo + Web Push
│   └── middleware.ts                # exime /manifest.json, /sw.js, /icons/* de auth
└── next.config.js                   # CSP con worker-src y manifest-src
```

Y en `packages/notifications/`:

```
web-push.ts                          # transport-only (sendWebPush, sendWebPushBatch)
push.ts                              # Expo (sendPushNotification, sendPushBatch)
index.ts                             # exporta ambos
```

## Manifest (`public/manifest.json`)

Campos clave:

```json
{
  "name": "Auctorum Med",
  "short_name": "Auctorum",
  "id": "/",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0891B2",
  "background_color": "#FAF7F2",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "purpose": "any" },
    { "src": "/icons/icon-192-maskable.png", "sizes": "192x192", "purpose": "maskable" },
    ...
  ],
  "shortcuts": [
    { "name": "Agenda del día", "url": "/agenda" },
    { "name": "Pacientes", "url": "/pacientes" },
    { "name": "Conversaciones", "url": "/conversaciones" }
  ]
}
```

Reglas:
- `id` debe ser estable — cambiarlo trata la PWA instalada como una nueva
  app distinta y obliga al usuario a reinstalar.
- `start_url` apunta a `/dashboard` para que tras instalar el ícono lleve
  directo al panel (no a la landing).
- Cada ícono `maskable` debe tener safe-zone interna (~80%) para sobrevivir
  al recorte circular en Android. El generador (`scripts/generate-pwa-icons.mjs`)
  ya lo hace con `innerScale: 0.55` para maskables.

## Service Worker (`public/sw.js`)

Estrategia:
1. **Install** — pre-cachea shell estático (`/`, `/login`, `/dashboard`,
   `/manifest.json`, `icon-192`, `icon-512`). Usa `cache.add` individual
   con `.catch(() => {})` para que un 404 puntual no aborte el install.
2. **Activate** — borra caches viejos (cualquier nombre que no empiece con
   la versión actual) y `clients.claim()` para tomar control inmediato.
3. **Fetch** — solo intercepta `GET` same-origin que NO sean `/api/`,
   `/auth/` ni `/login`. Estrategia network-first con fallback a cache.
   Si offline, cae al shell `/dashboard` para navegaciones, o devuelve
   "Sin conexión" para recursos.
4. **Push** — recibe `payload = { title, body, url, tag, data }`, muestra
   notificación con vibración 180-80-180, guarda `data.url` para el click.
5. **Notificationclick** — busca tabs abiertas mismo origin y `focus()`,
   navega a `data.url`. Si no hay ninguna, abre nueva.

`CACHE_VERSION` está en la primera línea (`auctorum-med-v2`). Cuando
cambias la lógica del SW, **bump la versión** para que el `activate`
purgue el cache previo y los clientes obtengan la nueva versión.

El SW se registra desde `layout.tsx`:

```tsx
const SW_REGISTER = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  });
}
`;
// ...
<script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
```

## Web Push (VAPID)

### Setup inicial (una sola vez)

```bash
cd packages/notifications
node -e 'const w = require("web-push"); console.log(JSON.stringify(w.generateVAPIDKeys()))'
# {"publicKey":"B...","privateKey":"..."}
```

Añadir a `apps/medconcierge/.env.local`:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="B...publicKey..."
VAPID_PUBLIC_KEY="B...publicKey..."
VAPID_PRIVATE_KEY="...privateKey..."
VAPID_SUBJECT="mailto:contacto@auctorum.com.mx"
```

> El `NEXT_PUBLIC_*` se inyecta al bundle del browser (lo necesita
> `push-client.ts` para `pushManager.subscribe`). Las dos versiones sin
> prefijo son server-only y se usan en `web-push.ts` para firmar.

### Flujo end-to-end

```
1. Usuario abre /dashboard estando autenticado
   ▼
2. <PushBootstrap /> espera 6s y verifica:
   - serviceWorker, PushManager, Notification disponibles
   - Notification.permission no es "denied" ni "granted"
   - localStorage no marca dismissed reciente
   ▼
3. Llama Notification.requestPermission() — el browser muestra el prompt nativo
   ▼
4. Si granted → pushManager.subscribe({ userVisibleOnly: true,
                                         applicationServerKey: VAPID_PUBLIC })
   ▼
5. POST /api/dashboard/push/subscribe con el subscription.toJSON()
   ▼
6. medconcierge :3001 valida CSRF + auth + zod, hace upsert idempotente
   en web_push_subscriptions ON CONFLICT (endpoint) DO UPDATE
   ▼
7. (después) worker dispara notifyDoctorDevices(tenantId, payload)
   ▼
8. notify-doctor.ts queries web_push_subscriptions WHERE tenant_id=...
   y llama sendWebPushBatch(subs, { title, body, url })
   ▼
9. web-push.ts firma con VAPID y POSTea al endpoint del browser
   (fcm.googleapis.com / web.push.apple.com / etc.)
   ▼
10. El browser despierta el SW (incluso con la pestaña cerrada)
    → SW dispara `push` event → showNotification(title, options)
    ▼
11. Doctor toca la notificación → notificationclick → focus tab + navigate(url)
```

### Limpieza de subscripciones muertas

`sendWebPushBatch` devuelve `{ expired: WebPushResult[] }` con todas las
subscripciones que respondieron `404` o `410`. `notify-doctor.ts` itera
ese array y hace `DELETE` por endpoint. Esto es la única excepción a la
regla "soft-delete siempre" — la subscripción ya está muerta upstream
(el browser la revocó), no hay valor en mantenerla.

## Install prompt

`<InstallPrompt />` se monta en `DashboardShell` y maneja dos rutas:

1. **Android Chrome / Edge / Samsung** — escucha `beforeinstallprompt`,
   cancela el comportamiento default, guarda el evento, y muestra un
   banner "Instalar Auctorum Med" con botón. El click llama
   `event.prompt()` y reacciona a `userChoice`.

2. **iOS Safari** — Apple no dispara `beforeinstallprompt`. Detectamos
   iOS Safari NO en standalone, esperamos 4s, y mostramos un banner
   con instrucciones manuales: "Toca ⎙ Compartir → Agregar a inicio".

Dismissals se persisten en `localStorage` (`auctorum_install_dismissed_at`)
con TTL de 30 días para no convertir en spam.

## iOS — caveats

- Solo iOS **16.4+** soporta Web Push para PWAs.
- El push solo funciona después de instalar la PWA en home screen
  ("Agregar a inicio") **y abrirla desde ese ícono**. En el browser
  normal no funciona.
- Apple ignora varios campos del manifest (`prefer_related_applications`,
  `shortcuts`, `categories`). Por eso duplicamos meta tags Apple en
  `layout.tsx`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`,
  `apple-touch-icon`, `viewport-fit=cover`.
- `format-detection telephone=no` evita que Safari convierta números de
  teléfono en links automáticamente (rompe layout en agendas).

## CSP (`next.config.js`)

Para que el SW pueda registrarse y los íconos cargarse, el CSP de
medconcierge incluye:

```
worker-src 'self' blob:
manifest-src 'self'
img-src 'self' data: blob: https://*.supabase.co ...
```

Sin `worker-src 'self' blob:` Chrome rechaza el SW. Sin `manifest-src`
Firefox bloquea el manifest. Si en algún momento tu CSP rompe la PWA,
revisa primero estas tres líneas.

## Middleware

`apps/medconcierge/src/middleware.ts` lista explícitamente como
*static-or-api* (sin auth gate, sin rewrite a tenant):

- `/manifest.json`
- `/sw.js`
- `/icons/*`
- `/screenshots/*`
- cualquier `*.json`, `*.js`, etc.

Si añades nuevos assets PWA, asegúrate de que matcheen una de estas
reglas o el middleware los redirigirá a `/login`.

## Generación de íconos

```bash
node scripts/generate-pwa-icons.mjs
```

Lee `apps/medconcierge/public/logo-transparent.png`, genera 8 PNGs
estándar + 2 maskable + apple-touch-icon (180×180). Usa `sharp` (ya está
en deps del root). Bg `#FAF7F2` (warm paper) para "any", bg `#0891B2`
(cyan) para maskables.

Si renombras el logo o cambias colores, edita las constantes al inicio
del script y vuelve a correr. Los íconos generados se commitean al repo
(no son assets dev-only).

## Generación de APK Android

PWAs cumplen el criterio de "Trusted Web Activity" en Play Store. Para
empaquetar:

### Opción A — PWABuilder (web)

1. Ir a https://www.pwabuilder.com/
2. Ingresar `https://med.auctorum.com.mx`
3. PWABuilder analiza manifest + SW + servicio
4. Click **Package for stores** → **Android**
5. Descarga el `.apk` firmable

### Opción B — Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://med.auctorum.com.mx/manifest.json
bubblewrap build
# genera app-release-signed.apk
```

Bubblewrap necesita `assetlinks.json` en
`apps/medconcierge/public/.well-known/assetlinks.json` con el SHA-256
del cert de firma. Sin esto, la app abre con barra de URL visible (no
fullscreen). Cualquier cambio del cert invalida assetlinks.

## Verificación post-deploy

```bash
# Manifest válido + reachable
curl -sI https://med.auctorum.com.mx/manifest.json | head -3
# Debe: HTTP/2 200, content-type: application/json

# SW reachable (con scope correcto)
curl -sI https://med.auctorum.com.mx/sw.js | head -3
# Debe: HTTP/2 200, content-type: application/javascript

# Íconos
for s in 72 96 128 144 152 192 384 512; do
  curl -sI https://med.auctorum.com.mx/icons/icon-${s}.png | head -1
done

# Subscribe endpoint (sin auth → 401, esperado)
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST https://med.auctorum.com.mx/api/dashboard/push/subscribe \
  -H 'Content-Type: application/json' -d '{}'
```

En el browser:
- Chrome DevTools → Application → Manifest: sin warnings
- DevTools → Application → Service Workers: status `activated and is running`
- DevTools → Lighthouse → "Progressive Web App": ≥ 90/100

Si Lighthouse marca "Web app manifest does not meet the installability
requirements", suele ser un ícono `192x192` o `512x512` faltante. Re-corre
`generate-pwa-icons.mjs`.

## Troubleshooting

| Síntoma                                        | Causa probable                       | Fix                                   |
|------------------------------------------------|--------------------------------------|---------------------------------------|
| Banner "Instalar" no aparece en Android        | SW no activated                      | DevTools → unregister + reload        |
| `pushManager.subscribe` falla con `AbortError` | VAPID public key inválida o ausente  | Verifica `NEXT_PUBLIC_VAPID_PUBLIC_KEY` está en build |
| Push llega pero no abre tab al click           | `notificationclick` no llama focus   | Verifica `clients.matchAll` en `sw.js`|
| iOS no recibe push aunque granted              | App no instalada en home screen      | Solo funciona post-install            |
| Manifest 404                                   | Middleware redirige a `/login`       | Confirmar `isStaticOrApi` lo incluye  |
| Íconos pixelados en Android                    | No tienes maskable                   | Re-genera y verifica purpose en JSON  |
