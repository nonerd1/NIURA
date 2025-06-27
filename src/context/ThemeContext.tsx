import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Text size scale options
export type TextSizeScale = 'small' | 'medium' | 'large';

const TEXT_SIZE_SCALES = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

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
  textSizeScale: TextSizeScale;
  setTextSizeScale: (scale: TextSizeScale) => void;
  getScaledFontSize: (baseFontSize: number) => number;
  updateFromBackendPreferences: (preferences: { dark_mode_enabled?: boolean }) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [textSizeScale, setTextSizeScaleState] = useState<TextSizeScale>('medium');

  // Load preferences from AsyncStorage on startup
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [darkModeValue, textSizeValue] = await Promise.all([
        AsyncStorage.getItem('darkMode'),
        AsyncStorage.getItem('textSizeScale'),
      ]);

      if (darkModeValue !== null) {
        setIsDarkMode(JSON.parse(darkModeValue));
      }

      if (textSizeValue !== null) {
        setTextSizeScaleState(textSizeValue as TextSizeScale);
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    }
  };

  const toggleTheme = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    try {
      await AsyncStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const setTextSizeScale = async (scale: TextSizeScale) => {
    setTextSizeScaleState(scale);
    try {
      await AsyncStorage.setItem('textSizeScale', scale);
    } catch (error) {
      console.error('Error saving text size preference:', error);
    }
  };

  const getScaledFontSize = (baseFontSize: number): number => {
    return Math.round(baseFontSize * TEXT_SIZE_SCALES[textSizeScale]);
  };

  // Update theme from backend preferences (called when app loads backend prefs)
  const updateFromBackendPreferences = async (preferences: { dark_mode_enabled?: boolean }) => {
    try {
      if (preferences.dark_mode_enabled !== undefined && preferences.dark_mode_enabled !== isDarkMode) {
        setIsDarkMode(preferences.dark_mode_enabled);
        await AsyncStorage.setItem('darkMode', JSON.stringify(preferences.dark_mode_enabled));
        console.log('✅ Theme synced with backend preferences');
      }
    } catch (error) {
      console.error('Error syncing theme with backend preferences:', error);
    }
  };

  const value = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? darkTheme : lightTheme,
    textSizeScale,
    setTextSizeScale,
    getScaledFontSize,
    updateFromBackendPreferences,
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