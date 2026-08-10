export const colors = {
  background: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEDE8',
  text: '#14201A',
  textSecondary: '#5C6B63',
  textTertiary: '#8A968F',
  border: '#E2E0DA',
  primary: '#1B4332',
  primaryPressed: '#143528',
  primarySoft: '#D8F3DC',
  accent: '#40916C',
  danger: '#C1121F',
  dangerSoft: '#FDECEC',
  warning: '#B7791F',
  overlay: 'rgba(20, 32, 26, 0.55)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  brand: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 34,
    lineHeight: 40,
  },
  h1: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  h3: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
  },
} as const;

export const shadows = {
  soft: {
    shadowColor: '#14201A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;
