export const colors = {
  background: '#07111F',
  surface: '#0D1A2B',
  surfaceElevated: '#11243B',
  surfaceMuted: '#19314F',
  border: '#233B5D',
  borderStrong: '#315988',
  text: '#F3F7FC',
  textMuted: '#C1CEDC',
  textSubtle: '#86A0BC',
  primary: '#31B5FF',
  primaryDark: '#1185D6',
  success: '#35D39A',
  warning: '#F4BD58',
  danger: '#FF7C77',
  conflict: '#B993FF',
  offline: '#F38B42',
  overlay: 'rgba(6, 14, 28, 0.58)',
  overlayHeavy: 'rgba(6, 14, 28, 0.84)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const typography = {
  title: 28,
  subtitle: 18,
  body: 16,
  label: 13,
  caption: 12,
} as const;

export const touchTarget = {
  minHeight: 52,
  iconButton: 52,
} as const;
