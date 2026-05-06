# Assets

Reemplaza los placeholders con los assets reales de Auctorum antes del primer build (`eas build`).

Archivos esperados:

- `icon.png` — 1024×1024 (icon de la app, sin transparencia)
- `splash.png` — 1284×2778 o similar (splash screen, fondo `#0891B2`)
- `adaptive-icon.png` — 1024×1024 (Android adaptive icon foreground)
- `notification-icon.png` — 96×96 (Android notification icon, blanco con transparencia)

Los archivos de logo de Auctorum existentes pueden usarse:

- `apps/medconcierge/public/logo-transparent.png` para el icon
- Color del splash: `#0891B2` (teal Auctorum)

`expo-asset` los empaqueta automáticamente al hacer build.
