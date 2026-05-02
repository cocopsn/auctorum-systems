// Two sidebar variants share the same accent palette per theme.
// Doctors pick a color (5 options) and a sidebar style (light/dark).
// Total: 10 themes (5 colors x 2 sidebars).

const LIGHT_SIDEBAR = {
  sidebar: '#FFFFFF',
  sidebarHover: '#F3F4F6',
  sidebarBorder: '#E5E7EB',
  sidebarText: '#6B7280',
  sidebarForeground: '#111827',
  userCardBg: '#F9FAFB',
} as const;

// Each theme provides its own DARK_SIDEBAR (matches accent for cohesion).

export const DASHBOARD_THEMES = {
  // ══ TEAL ══
  'teal-default': {
    name: 'Teal Clásico',
    variant: 'dark',
    primary: '#0891B2',
    primaryHover: '#0E7490',
    primaryLight: '#CFFAFE',
    sidebar: '#0F172A',
    sidebarHover: '#1E293B',
    sidebarBorder: '#1E293B',
    sidebarText: '#94A3B8',
    sidebarForeground: '#F1F5F9',
    sidebarActive: '#0891B2',
    sidebarActiveBg: 'rgba(8,145,178,0.15)',
    sidebarActiveFg: '#FFFFFF',
    userCardBg: '#1E293B',
    accent: '#06B6D4',
    swatch: '#0891B2',
  },
  'teal-light': {
    name: 'Teal Claro',
    variant: 'light',
    primary: '#0891B2',
    primaryHover: '#0E7490',
    primaryLight: '#CFFAFE',
    ...LIGHT_SIDEBAR,
    sidebarActive: '#0891B2',
    sidebarActiveBg: '#ECFEFF',
    sidebarActiveFg: '#0E7490',
    accent: '#06B6D4',
    swatch: '#0891B2',
  },

  // ══ GREEN MINT ══
  'green-mint': {
    name: 'Verde Menta',
    variant: 'dark',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#D1FAE5',
    sidebar: '#064E3B',
    sidebarHover: '#065F46',
    sidebarBorder: '#065F46',
    sidebarText: '#A7F3D0',
    sidebarForeground: '#ECFDF5',
    sidebarActive: '#10B981',
    sidebarActiveBg: 'rgba(16,185,129,0.15)',
    sidebarActiveFg: '#FFFFFF',
    userCardBg: '#065F46',
    accent: '#34D399',
    swatch: '#059669',
  },
  'green-mint-light': {
    name: 'Verde Menta Claro',
    variant: 'light',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#D1FAE5',
    ...LIGHT_SIDEBAR,
    sidebarActive: '#10B981',
    sidebarActiveBg: '#ECFDF5',
    sidebarActiveFg: '#047857',
    accent: '#34D399',
    swatch: '#059669',
  },

  // ══ BLUE DOCTOR ══
  'blue-doctor': {
    name: 'Azul Doctor',
    variant: 'dark',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryLight: '#DBEAFE',
    sidebar: '#1E3A5F',
    sidebarHover: '#1E40AF',
    sidebarBorder: '#1E40AF',
    sidebarText: '#93C5FD',
    sidebarForeground: '#EFF6FF',
    sidebarActive: '#3B82F6',
    sidebarActiveBg: 'rgba(59,130,246,0.15)',
    sidebarActiveFg: '#FFFFFF',
    userCardBg: '#1E40AF',
    accent: '#60A5FA',
    swatch: '#2563EB',
  },
  'blue-doctor-light': {
    name: 'Azul Doctor Claro',
    variant: 'light',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryLight: '#DBEAFE',
    ...LIGHT_SIDEBAR,
    sidebarActive: '#3B82F6',
    sidebarActiveBg: '#EFF6FF',
    sidebarActiveFg: '#1D4ED8',
    accent: '#60A5FA',
    swatch: '#2563EB',
  },

  // ══ CORAL MEDICAL ══
  'coral-medical': {
    name: 'Coral Médico',
    variant: 'dark',
    primary: '#E11D48',
    primaryHover: '#BE123C',
    primaryLight: '#FFE4E6',
    sidebar: '#1C1917',
    sidebarHover: '#292524',
    sidebarBorder: '#292524',
    sidebarText: '#A8A29E',
    sidebarForeground: '#FAFAF9',
    sidebarActive: '#F43F5E',
    sidebarActiveBg: 'rgba(244,63,94,0.15)',
    sidebarActiveFg: '#FFFFFF',
    userCardBg: '#292524',
    accent: '#FB7185',
    swatch: '#E11D48',
  },
  'coral-medical-light': {
    name: 'Coral Médico Claro',
    variant: 'light',
    primary: '#E11D48',
    primaryHover: '#BE123C',
    primaryLight: '#FFE4E6',
    ...LIGHT_SIDEBAR,
    sidebarActive: '#F43F5E',
    sidebarActiveBg: '#FFF1F2',
    sidebarActiveFg: '#BE123C',
    accent: '#FB7185',
    swatch: '#E11D48',
  },

  // ══ GRAY EXECUTIVE ══
  'gray-executive': {
    name: 'Gris Ejecutivo',
    variant: 'dark',
    primary: '#4B5563',
    primaryHover: '#374151',
    primaryLight: '#F3F4F6',
    sidebar: '#111827',
    sidebarHover: '#1F2937',
    sidebarBorder: '#1F2937',
    sidebarText: '#9CA3AF',
    sidebarForeground: '#F9FAFB',
    sidebarActive: '#6B7280',
    sidebarActiveBg: 'rgba(107,114,128,0.15)',
    sidebarActiveFg: '#FFFFFF',
    userCardBg: '#1F2937',
    accent: '#9CA3AF',
    swatch: '#4B5563',
  },
  'gray-executive-light': {
    name: 'Gris Ejecutivo Claro',
    variant: 'light',
    primary: '#4B5563',
    primaryHover: '#374151',
    primaryLight: '#F3F4F6',
    ...LIGHT_SIDEBAR,
    sidebarActive: '#6B7280',
    sidebarActiveBg: '#F3F4F6',
    sidebarActiveFg: '#1F2937',
    accent: '#9CA3AF',
    swatch: '#4B5563',
  },
} as const;

export type ThemeKey = keyof typeof DASHBOARD_THEMES;
export type DashboardTheme = typeof DASHBOARD_THEMES[ThemeKey];

export const DEFAULT_THEME: ThemeKey = 'teal-default';

// Helpers for the picker UI
export type ColorFamily = 'teal' | 'green-mint' | 'blue-doctor' | 'coral-medical' | 'gray-executive';
export type Variant = 'dark' | 'light';

const COLOR_FAMILY_NAMES: Record<ColorFamily, string> = {
  'teal': 'Teal',
  'green-mint': 'Verde Menta',
  'blue-doctor': 'Azul Doctor',
  'coral-medical': 'Coral Médico',
  'gray-executive': 'Gris Ejecutivo',
};

export function getColorFamily(key: ThemeKey): ColorFamily {
  // 'teal-default' or 'teal-light' -> 'teal'
  // 'green-mint' or 'green-mint-light' -> 'green-mint'
  if (key === 'teal-default' || key === 'teal-light') return 'teal';
  return key.replace(/-light$/, '') as ColorFamily;
}

export function getVariant(key: ThemeKey): Variant {
  return DASHBOARD_THEMES[key].variant;
}

export function buildThemeKey(family: ColorFamily, variant: Variant): ThemeKey {
  if (family === 'teal') {
    return variant === 'dark' ? 'teal-default' : 'teal-light';
  }
  return (variant === 'dark' ? family : `${family}-light`) as ThemeKey;
}

export function colorFamilyName(family: ColorFamily): string {
  return COLOR_FAMILY_NAMES[family];
}

export const COLOR_FAMILIES: ColorFamily[] = ['teal', 'green-mint', 'blue-doctor', 'coral-medical', 'gray-executive'];
