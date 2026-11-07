export const colors = {
  background: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F7FB',
  surfaceMuted: '#EAF0F8',

  border: '#E4EAF2',
  borderStrong: '#D1DCEB',

  textPrimary: '#1B2940',
  textSecondary: '#5D6D84',
  textMuted: '#8D9AAF',

  primary: '#2F6BFF',
  primaryLight: '#5B8CFF',
  primaryDark: '#2154D7',
  primarySoft: '#EAF1FF',

  success: '#20BFA7',
  warning: '#F5B942',
  danger: '#F15D6C',
  pink: '#F56C9A',
  purple: '#8B78F6',
  teal: '#20BFA7',

  navigationBackground: '#FFFFFF',
  navigationBorder: '#E7EEF9',
  glassBackground: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(201, 217, 243, 0.72)',
  white: '#FFFFFF',
} as const;

export const darkColors = {
  ...colors,
  background: '#0D1929',
  surface: '#142338',
  surfaceElevated: '#1A2C44',
  surfaceMuted: '#203752',
  border: '#29405B',
  borderStrong: '#39536F',
  textPrimary: '#F2F5FA',
  textSecondary: '#BCC8D8',
  textMuted: '#8D9CB2',
  primarySoft: '#193A77',
  navigationBackground: '#101F33',
  navigationBorder: '#29405B',
  glassBackground: 'rgba(20, 35, 56, 0.88)',
  glassBorder: 'rgba(141, 156, 178, 0.2)',
} as const;

export const gradients = {
  primary: ['#4C82FF', '#2458E8'],
  page: ['#F9FBFF', '#EDF4FF'],
  softBlue: ['#EEF5FF', '#DCEAFF'],
} as const;

export const shadows = {
  card: {
    shadowColor: '#243B5A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: '#2458E8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  navigation: {
    shadowColor: '#7693C2',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
} as const;

export const radius = {
  sm: 9,
  md: 13,
  lg: 17,
  xl: 21,
  round: 999,
} as const;

export const typhography = {
  hero: {
    fontSize: 30,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  caption: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
} as const;

export const theme = {
  colors,
  gradients,
  shadows,
  spacing,
  radius,
  typhography,
} as const;
