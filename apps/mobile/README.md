# Auctorum Med — Mobile App

React Native + Expo Router app para que el doctor vea su agenda, conversaciones, y pacientes desde el celular.

## MVP — 4 tabs

1. **Home** — KPIs (citas hoy, pacientes total, mensajes nuevos) + próximas 5 citas
2. **Agenda** — vista del día con slots y citas agendadas
3. **Conversaciones** — lista tipo WhatsApp + chat individual
4. **Pacientes** — buscador + lista + ficha con teléfono / WhatsApp / expediente

## Setup local (primera vez)

```bash
cd apps/mobile
npm install                # o pnpm/yarn
npx expo start             # abre Metro + QR para Expo Go en tu celular
```

Para correr en simulador iOS o Android:

```bash
npx expo run:ios           # requiere Xcode
npx expo run:android       # requiere Android Studio
```

## Builds OTA / store

Necesita una cuenta de Expo y EAS configurado (se hace una vez):

```bash
npm install -g eas-cli
eas login
eas build:configure        # genera el projectId, lo escribe en app.json -> extra.eas.projectId
eas build --platform android --profile preview     # APK para testing interno
eas build --platform android --profile production
eas build --platform ios --profile production
```

Submit a stores:

```bash
eas submit --platform android
eas submit --platform ios
```

## Backend que consume

La app habla con la API de medconcierge en `portal.auctorum.com.mx`:

- `POST /api/auth/mobile-login` — devuelve `access_token`, `refresh_token`, info de user/tenant
- `GET  /api/dashboard/stats` — KPIs del home
- `GET  /api/dashboard/appointments?date=YYYY-MM-DD` — agenda del día
- `GET  /api/dashboard/patients?search=...` — pacientes
- `GET  /api/dashboard/conversations` — lista de conversaciones
- `POST /api/dashboard/me/push-token` — registrar el Expo push token del dispositivo

`apiBaseUrl` se configura en `app.json` → `extra.apiBaseUrl`. Para apuntar a un staging local cambia ese valor.

## Estructura

```
app/
  _layout.tsx               # Root layout (auth gate)
  (auth)/
    _layout.tsx
    login.tsx
  (tabs)/
    _layout.tsx             # Bottom tabs
    index.tsx               # Home
    agenda.tsx
    conversations.tsx
    patients.tsx
  conversation/[id].tsx     # Chat detail
  patient/[id].tsx          # Patient detail
  settings.tsx
components/                 # AppointmentCard, ConversationItem, PatientCard, StatsCard, Header
lib/
  api.ts                    # Fetch wrapper con Bearer
  auth.ts                   # SecureStore + AuthContext
  notifications.ts          # Expo push token registration
  theme.ts                  # Auctorum palette
assets/                     # icon.png, splash.png, adaptive-icon.png, notification-icon.png
```

## Notas

- **Tokens** se guardan en `expo-secure-store` (encriptado, no `AsyncStorage`).
- **Push notifications** requieren EAS configurado y permisos del usuario.
- **Offline** no implementado en MVP — la app requiere conexión.
- Esta app **no comparte** dependencias con el monorepo pnpm — tiene su propio `node_modules` para evitar problemas con Metro bundler resolver.
