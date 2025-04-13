import { colors } from './colors';

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

export const fontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  light: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  strong: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const gradients = {
  primary: [colors.primary.main, colors.primary.light] as [string, string],
  accent1: [colors.accent1, colors.primary.main] as [string, string],
  accent2: [colors.accent2, colors.info] as [string, string],
  accent3: [colors.accent3, colors.success] as [string, string],
  background: colors.background.gradient as [string, string],
};

export const animations = {
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    // Add easing functions if needed
  },
};

export const theme = {
  colors,
  fontSizes,
  fontWeights,
  spacing,
  borderRadius,
  shadows,
  gradients,
  animations,
};

export default theme; 