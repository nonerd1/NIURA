import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { DemoProvider } from './src/context/DemoContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { BLEProvider } from './src/context/BLEContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { linking } from './src/navigation/linking';
import { LogBox } from 'react-native';

// Suppress known warnings and errors that are handled gracefully
LogBox.ignoreLogs([
  'Method Not Allowed', // Session labels endpoint limitation
  'An error occurred', // Generic backend errors that are handled
  'Failed to load session history', // Session history endpoint not implemented
  'Error fetching EEG aggregate data', // Expected daily aggregate failures
  'Error fetching session labels', // Expected session labels errors
]);

// Add global error handler for development
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Don't show error overlays for these expected errors
    if (
      message.includes('Method Not Allowed') ||
      message.includes('Failed to load session history') ||
      message.includes('Error fetching EEG aggregate data') ||
      message.includes('Error fetching session labels') ||
      message.includes('An error occurred')
    ) {
      // Log to console but don't trigger error overlay
      originalConsoleError('[Handled Error]', ...args);
      return;
    }
    
    // For all other errors, use normal error handling
    originalConsoleError(...args);
  };
}

export default function App() {
  return (
    <ThemeProvider>
      <DemoProvider>
        <BLEProvider>
          <DatabaseProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor={colors.background.dark} />
                <NavigationContainer linking={linking}>
                  <AppNavigator />
                </NavigationContainer>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </DatabaseProvider>
        </BLEProvider>
      </DemoProvider>
    </ThemeProvider>
  );
} 