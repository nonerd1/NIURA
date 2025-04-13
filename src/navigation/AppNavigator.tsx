import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking } from 'react-native';
import BottomTabNavigator from './BottomTabNavigator';
import DetailedMetricsScreen from '../screens/DetailedMetricsScreen';
import MentalReadinessDetailsScreen from '../screens/MentalReadinessDetailsScreen';
import DeepWorkScreen from '../screens/DeepWorkScreen';
import BluetoothScreen from '../screens/BluetoothScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TherapyJokesScreen from '../screens/TherapyJokesScreen';
import UIKitScreen from '../screens/UIKitScreen';
import SessionSummary from '../screens/SessionSummary';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerificationScreen from '../screens/VerificationScreen';
import { RootStackParamList } from '../types/navigation';
import { linking, handleOAuthCallback } from './linking';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  useEffect(() => {
    // Handle deep links
    const handleDeepLink = ({ url }: { url: string }) => {
      if (url) {
        handleOAuthCallback(url);
      }
    };

    // Handle deep link when app is already running
    Linking.addEventListener('url', handleDeepLink);

    // Handle deep link when app is not running and is launched by URL
    Linking.getInitialURL().then(url => {
      if (url) {
        handleOAuthCallback(url);
      }
    });

    return () => {
      // Clean up
      Linking.removeAllListeners('url');
    };
  }, []);

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen 
        name="DetailedMetrics" 
        component={DetailedMetricsScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="MentalReadinessDetails" 
        component={MentalReadinessDetailsScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="DeepWork" 
        component={DeepWorkScreen}
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          detachPreviousScreen: false,
          cardStyle: { backgroundColor: '#0E1624' },
        }}
      />
      <Stack.Screen 
        name="Bluetooth" 
        component={BluetoothScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="TherapyJokes" 
        component={TherapyJokesScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="UIKit" 
        component={UIKitScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="SessionSummary" 
        component={SessionSummary}
        options={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator; 