export const colors = {
    background: '#071123',
    surface: '#101D33',
    surfaceElevated: '#14233D',
    surfaceMuted: '#172641',

    border: '#20304A',
    borderStrong: '#2A3A55',

    textPrimary: '#F8FAFC',
    textSecondary: '#E8EEF8',
    textMuted: '#8290A8',

    primary: '#3B82F6',
    primaryLight: '#60A5FA',

    success: '#10B981',
    warning: '#F97316',
    danger: '#EF4444',
    pink: '#EC4899',
    purple: '#8B5CF6',
    teal: '#14B8A6',

    navigationBackground: '#0D1930',
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
    sm: 8,
    md: 12,
    lg: 14,
    xl: 20,
    round: 999,
} as const;

export const typhography = {
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
        fontWeight: '600' as const,
    },
    caption: {
        fontSize: 9,
        fontWeight: '400' as const,
    }
} as const;

export const theme = {
    colors,
    spacing,
    radius,
    typhography,
} as const;