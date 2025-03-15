import React, { createContext, useContext, useState } from 'react';

// Light theme colors
const lightTheme = {
  background: {
    dark: '#F8FAFC',
    card: '#FFFFFF',
    gradient: ['#F8FAFC', '#F1F5F9'],
  },
  text: {
    primary: '#0F172A',
    secondary: '#64748B',
  },
  primary: {
    main: '#4A80F0',
    light: '#70A1FF',
  },
  error: '#FF4D6D',
  success: '#25C485',
  warning: '#FFB020',
  info: '#60A5FA',
  accent1: '#F471B5',
  accent2: '#9F7AEA',
  accent3: '#4FD1C5',
};

// Dark theme colors (existing theme)
const darkTheme = {
  background: {
    dark: '#141E30',
    card: '#1E293B',
    gradient: ['#141E30', '#243B55'],
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
  },
  primary: {
    main: '#4A80F0',
    light: '#70A1FF',
  },
  error: '#FF4D6D',
  success: '#25C485',
  warning: '#FFB020',
  info: '#60A5FA',
  accent1: '#F471B5',
  accent2: '#9F7AEA',
  accent3: '#4FD1C5',
};

export type Theme = typeof darkTheme;

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? darkTheme : lightTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const colors = darkTheme; // Export default colors for backward compatibility 