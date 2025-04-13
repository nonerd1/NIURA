export const colors = {
  primary: {
    main: '#4A80F0', // Vibrant blue for primary actions
    dark: '#141E30', // Deep navy for backgrounds
    darker: '#0F172A', // Darker navy for contrast
    light: '#70A1FF', // Lighter blue for highlights
  },
  background: {
    dark: '#141E30', // Base dark blue
    card: '#1E293B', // Card background
    gradient: ['#141E30', '#243B55'], // More dramatic gradient for depth
    accent: ['#4A80F0', '#70A1FF'], // Accent gradient for buttons
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)', // Slightly more visible secondary text
    accent: '#4A80F0',
  },
  common: {
    white: '#FFFFFF',
    black: '#000000',
    border: '#2A3A50', // Slightly warmer border color
  },
  error: '#FF4D6D', // More pleasant red
  success: '#25C485', // More saturated green
  warning: '#FFB020', // Warmer amber
  info: '#60A5FA', // Info blue
  // Additional accent colors for variety
  accent1: '#F471B5', // Pink
  accent2: '#9F7AEA', // Purple
  accent3: '#4FD1C5', // Teal
} as const;

export type ThemeColors = typeof colors; 