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
  primaryGlow: 'rgba(49, 181, 255, 0.15)',
  success: '#35D39A',
  successGlow: 'rgba(53, 211, 154, 0.12)',
  warning: '#F4BD58',
  danger: '#FF7C77',
  dangerGlow: 'rgba(255, 124, 119, 0.12)',
  conflict: '#B993FF',
  conflictGlow: 'rgba(185, 147, 255, 0.12)',
  offline: '#F38B42',
  overlay: 'rgba(6, 14, 28, 0.58)',
  overlayHeavy: 'rgba(6, 14, 28, 0.84)',
  gradientStart: '#0D1A2B',
  gradientEnd: '#07111F',
  glassBg: 'rgba(13, 26, 43, 0.72)',
  glassBorder: 'rgba(49, 89, 136, 0.4)',
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
  hero: 34,
  title: 28,
  subtitle: 18,
  body: 16,
  label: 13,
  caption: 12,
  tiny: 10,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const touchTarget = {
  minHeight: 52,
  iconButton: 52,
} as const;

export const animation = {
  fast: 180,
  normal: 300,
  slow: 500,
  spring: {
    damping: 18,
    stiffness: 240,
  },
} as const;
