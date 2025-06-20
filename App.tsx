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