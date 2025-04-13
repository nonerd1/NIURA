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

export default function App() {
  return (
    <ThemeProvider>
      <DemoProvider>
        <BLEProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <StatusBar barStyle="light-content" backgroundColor={colors.background.dark} />
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </BLEProvider>
      </DemoProvider>
    </ThemeProvider>
  );
} 