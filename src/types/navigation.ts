import { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  Home: undefined;
  Insights: undefined;
  DeepWork: undefined;
  Calendar: undefined;
  Options: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Verification: {
    email: string;
  };
  MainTabs: NavigatorScreenParams<RootTabParamList>;
  DetailedMetrics: {
    focusData: number[];
    stressData: number[];
    labels: string[];
    lastUpdated: string;
    focusLevel: string;
    focusValue: number;
    stressLevel: string;
    stressValue: number;
    focusColor: string;
    stressColor: string;
    mentalReadinessScore: number;
    mentalReadinessLevel: string;
    correlationData: {
      highFocusHighStress: number;
      highFocusLowStress: number;
      lowFocusHighStress: number;
      lowFocusLowStress: number;
    };
    recommendations: string[];
  };
  MentalReadinessDetails: {
    data: number[];
    labels: string[];
    color: string;
    lastUpdated: string;
    score: number;
    level: string;
  };
  DeepWork: undefined;
  Bluetooth: undefined;
  Profile: undefined;
  TherapyJokes: undefined;
  UIKit: undefined;
  SessionSummary: {
    duration: number;
    focusData: number[];
    stressData: number[];
    distractionCount: number;
    completedTasks: number;
    totalTasks: number;
  };
};

export type NavigationProp = import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>; 