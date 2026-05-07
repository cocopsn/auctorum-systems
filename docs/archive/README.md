# Archive

Documentos históricos. **No son fuente de verdad.** Se preservan como
referencia de cómo se veía el sistema en un momento específico (auditorías,
QA reports, scripts de demos viejos, etc.).

Para el estado actual ver:
- `../../README.md` — overview
- `../ARCHITECTURE.md` — arquitectura del sistema
- `../DEPLOYMENT.md` — operación y deploy
- `../PWA.md` — service worker / web push
- `../../CLAUDE.md` — reglas operativas para agentes

| Archivo                                  | Fecha original | Tema                                         |
|------------------------------------------|----------------|----------------------------------------------|
| `AUDIT-REPORT-2026-04-13.md`             | 2026-04-13     | Auditoría completa pre-rebrand               |
| `SECURITY-AUDIT-2026-04-20.md`           | 2026-04-20     | Pentest + 37 hallazgos                       |
| `QA-FINAL-REPORT-2026-04-21.md`          | 2026-04-21     | QA exhaustivo de rutas y dashboard           |
| `QA-AUTHENTICATED-REPORT-2026-04.md`     | 2026-04        | QA con sesión autenticada                    |
| `DEMO-SCRIPT-2026-04.md`                 | 2026-04-14     | Script de demo a Marco — branch v2-premium   |
| `AUDIT-REPORT-2026-05-06.md`             | 2026-05-06     | Codebase audit — dead code removal + dep prune |

**Detalles desactualizados conocidos en estos archivos:**
- IP del VPS (los reports mencionan `142.93.199.126` o `164.92.84.127` —
  ya no aplican)
- Branch `feat/v2-premium-redesign` — el trabajo está mergeado a `main`
- Specs del VPS (era 2 GiB, ahora 8 GiB)
- Ausencia de PWA, Web Push, mobile app, circuit breakers, rate limiting
- Hardcoding de tenants específicos (`dra-martinez`) en redirects —
  arreglado en `caac2e0`
