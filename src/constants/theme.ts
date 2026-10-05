export const colors = {
  background: '#F6F9FF',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F5FF',
  surfaceMuted: '#E7F0FF',

  border: '#E1EAF8',
  borderStrong: '#C9D9F3',

  textPrimary: '#172B4D',
  textSecondary: '#49658C',
  textMuted: '#8497B5',

  primary: '#2F6BFF',
  primaryLight: '#5B8CFF',
  primaryDark: '#2154D7',
  primarySoft: '#E8F0FF',

  success: '#20BFA7',
  warning: '#F5B942',
  danger: '#F15D6C',
  pink: '#F56C9A',
  purple: '#8B78F6',
  teal: '#20BFA7',

  navigationBackground: '#FFFFFF',
  navigationBorder: '#E7EEF9',
  white: '#FFFFFF',
} as const;

export const gradients = {
  primary: ['#4C82FF', '#2458E8'],
  page: ['#F9FBFF', '#EDF4FF'],
  softBlue: ['#EEF5FF', '#DCEAFF'],
} as const;

export const shadows = {
  card: {
    shadowColor: '#2E5FA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#2458E8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 7,
  },
  navigation: {
    shadowColor: '#7693C2',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
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
