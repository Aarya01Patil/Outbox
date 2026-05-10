export const colors = {
  background: '#0B1220',
  surface: '#111827',
  surfaceMuted: '#1F2937',
  border: '#334155',
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  textSubtle: '#94A3B8',
  primary: '#38BDF8',
  primaryDark: '#0284C7',
  success: '#34D399',
  warning: '#F59E0B',
  danger: '#F87171',
  conflict: '#C084FC',
  offline: '#F97316',
  overlay: 'rgba(2, 6, 23, 0.68)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  title: 28,
  subtitle: 18,
  body: 16,
  label: 13,
  caption: 12,
} as const;

export const touchTarget = {
  minHeight: 48,
  iconButton: 48,
} as const;
