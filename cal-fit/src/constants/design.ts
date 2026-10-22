/**
 * Cal-Fit design tokens, taken from design/app_ui.png.
 * Light-only: the mockup defines no dark theme.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#1F6FF2',
  primaryDark: '#0B57E3',
  primaryLight: '#3D8BFF',
  primaryTint: '#EAF2FF',
  primaryBorder: '#BFD6FF',

  navy: '#0B1B3F',
  text: '#0B1B3F',
  textSecondary: '#5B6B8C',
  textMuted: '#93A0BA',

  background: '#F5F8FE',
  surface: '#FFFFFF',
  border: '#E6ECF7',
  track: '#EDF1F8',

  success: '#22C55E',
  teal: '#14B8A6',
  amber: '#F5A524',
  orange: '#FF7A1A',
  danger: '#EF4444',

  darkOverlay: 'rgba(11, 27, 63, 0.86)',
  white: '#FFFFFF',
} as const;

/** Gradient for primary buttons (top-left → bottom-right). */
export const primaryGradient = ['#3D8BFF', '#0B57E3'] as const;
/** Hero gradient used on the splash/welcome placeholders. */
export const heroGradient = ['#0B1B3F', '#123A8C', '#1F6FF2'] as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Horizontal screen padding used across the mockup. */
export const screenPadding = 20;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, color: colors.navy },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.navy },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.navy },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.navy },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.navy },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.navy },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.white },
} satisfies Record<string, TextStyle>;

/** Soft blue-tinted shadow used on cards in the mockup. */
export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 6px 20px rgba(31, 111, 242, 0.08)' } as ViewStyle,
  default: {
    shadowColor: '#1F6FF2',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
})!;

/** Stronger glow under primary buttons. */
export const buttonShadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 8px 20px rgba(31, 111, 242, 0.30)' } as ViewStyle,
  default: {
    shadowColor: '#1F6FF2',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
})!;
