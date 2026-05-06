/**
 * Auctorum Med color palette + spacing tokens. Mirrors the web app so the
 * mobile app feels like the same product.
 */

export const colors = {
  primary: '#0891B2',
  primaryDark: '#0E7490',
  primaryLight: '#CFFAFE',
  background: '#FFFFFF',
  surface: '#F8FAFB',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  success: '#059669',
  successBg: '#D1FAE5',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodySm: { fontSize: 13, color: colors.text },
  caption: { fontSize: 12, color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: '600' as const, color: colors.textTertiary, letterSpacing: 0.5 },
} as const

export const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  scheduled: { bg: '#F1F5F9', fg: '#475569', label: 'Agendada' },
  confirmed: { bg: colors.infoBg,    fg: colors.info,    label: 'Confirmada' },
  completed: { bg: colors.successBg, fg: colors.success, label: 'Completada' },
  cancelled: { bg: colors.dangerBg,  fg: colors.danger,  label: 'Cancelada' },
  no_show:   { bg: colors.warningBg, fg: colors.warning, label: 'No asistió' },
}
