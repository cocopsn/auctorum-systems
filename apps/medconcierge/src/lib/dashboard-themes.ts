// White-theme tenant portal: sidebar is always white/light. Themes only
// change accent colors (active item, primary buttons, etc.).
const LIGHT_SIDEBAR = {
  sidebar: '#FFFFFF',
  sidebarHover: '#F3F4F6',
  sidebarBorder: '#E5E7EB',
  sidebarText: '#6B7280',
  sidebarForeground: '#111827',
  userCardBg: '#F9FAFB',
} as const;

export const DASHBOARD_THEMES = {
  'teal-default': {
    name: 'Teal Clásico',
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
  'green-mint': {
    name: 'Verde Menta',
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
  'blue-doctor': {
    name: 'Azul Doctor',
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
  'coral-medical': {
    name: 'Coral Médico',
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
  'gray-executive': {
    name: 'Gris Ejecutivo',
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
