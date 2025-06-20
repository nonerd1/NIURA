import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, ClipPath, Circle, Text as SvgText, Rect, Polygon } from 'react-native-svg';
import MetricsGraph from '../components/MetricsGraph';
import SpeedometerMetrics from '../components/SpeedometerMetrics';
import { colors } from '../theme/colors';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useDemo } from '../context/DemoContext';
import { NativeEventEmitter, NativeModules, PermissionsAndroid } from 'react-native';
import { useBLE } from '../context/BLEContext';
import { logDebug } from '../utils/logger';
import { databaseService } from '../services/database';

type Tab = 'focus' | 'stress' | 'mental';

type MetricsData = {
  data: number[];
  labels: string[];
};

type MetricDataPoint = {
  timestamp: Date;
  value: number;
  type: 'attention' | 'stress';
};

// Add type for navigation params
type RootStackParamList = {
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
  Bluetooth: undefined;
  Profile: undefined;
  UIKit: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data generator - Replace this with real data from your backend
const generateMockData = (hours: number) => {
  const data: number[] = [];
  const labels: string[] = [];
  const now = new Date();
  
  // Start with a base value between 1 and 2
  let currentValue = 1.5;
  
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
    
    // Generate a small random change (-0.2 to +0.2)
    const change = (Math.random() * 0.4) - 0.2;
    
    // Update current value and ensure it stays between 0 and 3
    currentValue = Math.max(0, Math.min(3, currentValue + change));
    
    // Round to 1 decimal place
    const value = Number(currentValue.toFixed(1));
    
    data.push(value);
    labels.push(`${time.getHours()}:00`);
  }
  
  return { data, labels };
};

// Generate a single value update
const generateValueUpdate = (currentValue: number) => {
  // Generate a small random change (-0.3 to +0.3)
  const change = (Math.random() * 0.6) - 0.3;
  
  // Update current value and ensure it stays between 0 and 3
  const newValue = Math.max(0, Math.min(3, currentValue + change));
  
  // Round to 1 decimal place
  return Number(newValue.toFixed(1));
};

// Move toPercentage function outside of HomeScreen component so it's accessible to all components
const toPercentage = (value: number) => Math.round((value / 3) * 100);

const BrainIcon = ({ score, size = 48 }: { score: number; size?: number }) => {
  const fillPercentage = score / 100;
  const fillHeight = 400 - (400 * fillPercentage);
  
  return (
    <View>
      <Svg width={size} height={size} viewBox="0 0 400 400">
        <Defs>
          <SvgGradient id="fillGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0" stopColor={colors.primary.main} />
            <Stop offset="1" stopColor={colors.error} />
          </SvgGradient>
          <ClipPath id="fillClip">
            <Path d={`M0 400V${fillHeight} H400 V400z`} />
          </ClipPath>
        </Defs>
        
        {/* Brain outline */}
        <Path
          d="M6.32291 179.77C10.6624 186.859 16.9703 192.536 24.4806 196.106C28.0419 197.8 29.5556 202.063 27.8588 205.627C26.1621 209.189 21.8988 210.702 18.3375 209.006C15.4811 207.623 12.7468 206.006 10.1589 204.169C17.9927 227.392 39.7544 243.044 64.2657 243.084H64.693C64.281 239.141 64.1894 235.174 64.4153 231.219C67.5799 193.131 99.6839 163.987 137.9 164.512H178.549C182.495 164.512 185.69 161.313 185.69 157.371C185.69 145.536 195.285 135.942 207.119 135.942H228.548C232.494 135.942 235.689 139.14 235.689 143.086C235.689 147.028 232.494 150.227 228.548 150.227H207.119C203.174 150.227 199.978 153.425 199.978 157.371C199.978 169.205 190.384 178.797 178.549 178.797H137.9C107.216 178.257 81.3462 201.553 78.679 232.125C78.3311 237.533 78.7492 242.962 79.921 248.254C80.2292 249.682 80.5924 251.025 81.0013 252.377C81.0776 252.639 81.157 252.911 81.2424 253.176C81.6849 254.604 82.1793 255.962 82.7286 257.311L82.8995 257.717C89.7475 274.102 103.764 286.415 120.893 291.097L121.415 291.231C122.721 291.576 124.049 291.86 125.392 292.11C126.063 292.232 126.75 292.323 127.427 292.424C128.4 292.568 129.365 292.717 130.351 292.812C132.114 292.973 133.921 293.083 135.691 293.083C153.766 293.034 170.755 284.45 181.522 269.933C178.137 267.772 174.89 265.41 171.793 262.862C168.759 260.338 168.344 255.834 170.868 252.801C173.389 249.767 177.893 249.352 180.927 251.876C200.662 268.294 226.727 274.984 251.931 270.098C277.135 265.209 298.808 249.261 310.975 226.654C307.142 221.444 304.222 215.622 302.339 209.433C301.249 205.664 303.404 201.718 307.167 200.601C310.926 199.481 314.887 201.608 316.032 205.362C321.568 224.139 339.124 236.779 358.689 236.071C378.253 235.363 394.851 221.487 399.014 202.359C403.18 183.231 393.854 163.712 376.352 154.935C375.443 159.089 374.222 163.169 372.702 167.142C371.268 170.817 367.124 172.635 363.446 171.198C359.769 169.764 357.953 165.616 359.388 161.942C361.631 156.168 363.105 150.126 363.767 143.971C363.883 142.985 363.953 142.063 364.023 141.114C364.145 139.39 364.261 137.678 364.261 135.942C364.261 104.973 344.263 77.5501 314.775 68.0868C317.021 71.4833 319.016 75.0416 320.747 78.7281C321.937 81.0627 321.751 83.8641 320.265 86.0217C318.778 88.1792 316.227 89.3511 313.621 89.0734C311.015 88.7926 308.772 87.1081 307.774 84.685C292.168 51.2291 253.704 35.0947 218.899 47.4084C213.632 49.2211 208.599 51.6472 203.9 54.6348C200.592 56.7893 196.167 55.8555 194.012 52.5505C191.858 49.2455 192.792 44.8175 196.1 42.663C197.177 41.9489 198.306 41.3355 199.414 40.6794C184.286 33.4956 166.538 34.5363 152.356 43.4442C155.668 46.3708 158.628 49.6728 161.179 53.286C162.702 55.3764 162.973 58.126 161.893 60.4758C160.813 62.8256 158.545 64.4095 155.967 64.6109C153.388 64.8153 150.901 63.6069 149.463 61.4554C146.094 56.6551 141.779 52.5902 136.787 49.5141H136.719C118.125 37.9511 93.788 42.4127 80.5069 59.8227C83.3328 60.6284 86.0916 61.6568 88.7588 62.8989C91.1238 63.9578 92.7321 66.213 92.961 68.7948C93.1868 71.3765 91.9997 73.8789 89.8543 75.3346C87.709 76.7872 84.9441 76.9673 82.6279 75.7985C71.0619 70.3328 57.6588 70.3176 46.0806 75.7618C34.5055 81.203 25.9637 91.5331 22.793 103.929C26.6351 102.467 30.6206 101.427 34.6855 100.829C38.5948 100.27 42.2141 102.989 42.7695 106.895C43.3249 110.802 40.6089 114.421 36.6996 114.976C30.169 115.916 23.9465 118.361 18.5236 122.12L18.429 122.2C-0.177234 135.054 -5.53299 160.19 6.2222 179.511C6.26493 179.612 6.28019 179.697 6.32291 179.77Z"
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1"
        />
        
        {/* Filled portion */}
        <Path
          d="M6.32291 179.77C10.6624 186.859 16.9703 192.536 24.4806 196.106C28.0419 197.8 29.5556 202.063 27.8588 205.627C26.1621 209.189 21.8988 210.702 18.3375 209.006C15.4811 207.623 12.7468 206.006 10.1589 204.169C17.9927 227.392 39.7544 243.044 64.2657 243.084H64.693C64.281 239.141 64.1894 235.174 64.4153 231.219C67.5799 193.131 99.6839 163.987 137.9 164.512H178.549C182.495 164.512 185.69 161.313 185.69 157.371C185.69 145.536 195.285 135.942 207.119 135.942H228.548C232.494 135.942 235.689 139.14 235.689 143.086C235.689 147.028 232.494 150.227 228.548 150.227H207.119C203.174 150.227 199.978 153.425 199.978 157.371C199.978 169.205 190.384 178.797 178.549 178.797H137.9C107.216 178.257 81.3462 201.553 78.679 232.125C78.3311 237.533 78.7492 242.962 79.921 248.254C80.2292 249.682 80.5924 251.025 81.0013 252.377C81.0776 252.639 81.157 252.911 81.2424 253.176C81.6849 254.604 82.1793 255.962 82.7286 257.311L82.8995 257.717C89.7475 274.102 103.764 286.415 120.893 291.097L121.415 291.231C122.721 291.576 124.049 291.86 125.392 292.11C126.063 292.232 126.75 292.323 127.427 292.424C128.4 292.568 129.365 292.717 130.351 292.812C132.114 292.973 133.921 293.083 135.691 293.083C153.766 293.034 170.755 284.45 181.522 269.933C178.137 267.772 174.89 265.41 171.793 262.862C168.759 260.338 168.344 255.834 170.868 252.801C173.389 249.767 177.893 249.352 180.927 251.876C200.662 268.294 226.727 274.984 251.931 270.098C277.135 265.209 298.808 249.261 310.975 226.654C307.142 221.444 304.222 215.622 302.339 209.433C301.249 205.664 303.404 201.718 307.167 200.601C310.926 199.481 314.887 201.608 316.032 205.362C321.568 224.139 339.124 236.779 358.689 236.071C378.253 235.363 394.851 221.487 399.014 202.359C403.18 183.231 393.854 163.712 376.352 154.935C375.443 159.089 374.222 163.169 372.702 167.142C371.268 170.817 367.124 172.635 363.446 171.198C359.769 169.764 357.953 165.616 359.388 161.942C361.631 156.168 363.105 150.126 363.767 143.971C363.883 142.985 363.953 142.063 364.023 141.114C364.145 139.39 364.261 137.678 364.261 135.942C364.261 104.973 344.263 77.5501 314.775 68.0868C317.021 71.4833 319.016 75.0416 320.747 78.7281C321.937 81.0627 321.751 83.8641 320.265 86.0217C318.778 88.1792 316.227 89.3511 313.621 89.0734C311.015 88.7926 308.772 87.1081 307.774 84.685C292.168 51.2291 253.704 35.0947 218.899 47.4084C213.632 49.2211 208.599 51.6472 203.9 54.6348C200.592 56.7893 196.167 55.8555 194.012 52.5505C191.858 49.2455 192.792 44.8175 196.1 42.663C197.177 41.9489 198.306 41.3355 199.414 40.6794C184.286 33.4956 166.538 34.5363 152.356 43.4442C155.668 46.3708 158.628 49.6728 161.179 53.286C162.702 55.3764 162.973 58.126 161.893 60.4758C160.813 62.8256 158.545 64.4095 155.967 64.6109C153.388 64.8153 150.901 63.6069 149.463 61.4554C146.094 56.6551 141.779 52.5902 136.787 49.5141H136.719C118.125 37.9511 93.788 42.4127 80.5069 59.8227C83.3328 60.6284 86.0916 61.6568 88.7588 62.8989C91.1238 63.9578 92.7321 66.213 92.961 68.7948C93.1868 71.3765 91.9997 73.8789 89.8543 75.3346C87.709 76.7872 84.9441 76.9673 82.6279 75.7985C71.0619 70.3328 57.6588 70.3176 46.0806 75.7618C34.5055 81.203 25.9637 91.5331 22.793 103.929C26.6351 102.467 30.6206 101.427 34.6855 100.829C38.5948 100.27 42.2141 102.989 42.7695 106.895C43.3249 110.802 40.6089 114.421 36.6996 114.976C30.169 115.916 23.9465 118.361 18.5236 122.12L18.429 122.2C-0.177234 135.054 -5.53299 160.19 6.2222 179.511C6.26493 179.612 6.28019 179.697 6.32291 179.77Z"
          fill="url(#fillGradient)"
          clipPath="url(#fillClip)"
        />
      </Svg>
      
      {/* Add gradient bar below the brain */}
      <LinearGradient
        colors={[colors.primary.main, colors.warning]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          height: 4,
          width: size,
          borderRadius: 2,
          marginTop: 4
        }}
      />
    </View>
  );
};

const RealTimeMetrics = ({ focusValue, stressValue }: { focusValue: number, stressValue: number }) => {
  return (
    <View style={styles.realTimeMetricsContainer}>
      <Text style={styles.realTimeMetricsTitle}>Real-Time Metrics</Text>
      
      <SpeedometerMetrics
        focusValue={focusValue}
        stressValue={stressValue}
        containerStyle={styles.speedometersContainer}
      />
    </View>
  );
};

const TodaysMetrics = ({ focusData, stressData, focusValue, stressValue }: {
  focusData: MetricsData,
  stressData: MetricsData,
  focusValue: number,
  stressValue: number
}) => {
  const navigation = useNavigation<NavigationProp>();
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert to 12-hour format
  const lastUpdated = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
  const getFocusLevel = (value: number) => {
    if (value >= 2.5) return 'HIGH';
    if (value >= 1.5) return 'MEDIUM';
    return 'LOW';
  };

  // Generate today's hourly data for the chart
  const generateTodaysData = () => {
    const hours = [];
    const focusData = [];
    const stressData = [];
    const currentHour = now.getHours();
    
    // Generate data for the last 6 hours
    for (let i = 5; i >= 0; i--) {
      const hour = (currentHour - i + 24) % 24;
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hours.push(`${hour12}${ampm}`);
      
      // Generate realistic focus data that trends toward current value
      const baseFocusValue = focusValue;
      const focusVariation = (Math.random() - 0.5) * 0.6; // ±0.3 variation
      focusData.push(Math.max(0, Math.min(3, baseFocusValue + focusVariation)));
      
      // Generate realistic stress data that trends toward current value
      const baseStressValue = stressValue;
      const stressVariation = (Math.random() - 0.5) * 0.6; // ±0.3 variation
      stressData.push(Math.max(0, Math.min(3, baseStressValue + stressVariation)));
    }
    
    return { labels: hours, focusData, stressData };
  };

  const todaysData = generateTodaysData();

  return (
    <View style={styles.todaysMetricsContainer}>
      <Text style={styles.todaysMetricsTitle}>Today's Metrics</Text>
      
      <View style={styles.chartHeader}>
        <Text style={styles.lastUpdated}>Last updated {lastUpdated}</Text>
        <View style={styles.currentValueContainer}>
          <Text style={[styles.currentLevel, { color: '#4287f5' }]}>
            {getFocusLevel(focusValue)} {focusValue.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <MetricsGraph
          labels={todaysData.labels}
          datasets={[
            {
              data: todaysData.focusData,
              color: '#4287f5',
              label: 'Focus',
            },
            {
              data: todaysData.stressData,
              color: '#FFA500',
              label: 'Stress',
            },
          ]}
          type="focus"
          hideHeader={true}
          onPress={() => {
            try {
              navigation.navigate('DetailedMetrics', {
                focusData: todaysData.focusData,
                stressData: todaysData.stressData,
                labels: todaysData.labels,
                lastUpdated: lastUpdated,
                focusLevel: getFocusLevel(focusValue),
                focusValue: focusValue,
                stressLevel: getFocusLevel(stressValue),
                stressValue: stressValue,
                focusColor: '#4287f5',
                stressColor: '#FFA500',
                mentalReadinessScore: 75,
                mentalReadinessLevel: 'Good',
                correlationData: {
                  highFocusHighStress: 25,
                  highFocusLowStress: 35,
                  lowFocusHighStress: 15,
                  lowFocusLowStress: 25
                },
                recommendations: [
                  'Take regular breaks every 25 minutes',
                  'Try deep breathing exercises',
                  'Consider meditation sessions'
                ]
              });
            } catch (error) {
              console.error('Error navigating to detailed metrics:', error);
            }
          }}
        />
      </View>
    </View>
  );
};

const BestFocusTime = () => {
  return (
    <View style={styles.bestFocusContainer}>
      <View style={styles.bestFocusHeader}>
        <MaterialCommunityIcons name="timer-outline" size={20} color={colors.text.primary} />
        <Text style={styles.bestFocusTitle}>Best Time to Focus</Text>
      </View>
      <View style={styles.bestFocusContent}>
        <LinearGradient
          colors={[colors.primary.main, colors.primary.light]}
          style={styles.timeChip}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.timeText}>10:00 AM - 12:00 PM</Text>
        </LinearGradient>
        <Text style={styles.bestFocusDescription}>
          Based on your focus patterns, you're most productive during these hours
        </Text>
      </View>
    </View>
  );
};

const MoodMusic = () => {
  return (
    <View style={styles.moodMusicContainer}>
      <View style={styles.moodMusicHeader}>
        <Ionicons name="musical-notes" size={20} color={colors.text.primary} />
        <Text style={styles.moodMusicTitle}>Music for You</Text>
      </View>
      <View style={styles.moodMusicContent}>
        <LinearGradient
          colors={[colors.primary.main, colors.primary.light]}
          style={styles.musicCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.musicInfo}>
            <Text style={styles.musicType}>Focus Beats</Text>
            <Text style={styles.musicDescription}>Lo-fi beats to help you concentrate</Text>
          </View>
          <Ionicons name="play-circle" size={36} color={colors.text.primary} />
        </LinearGradient>
      </View>
    </View>
  );
};

const Tasks = () => {
  return (
    <View style={styles.tasksContainer}>
      <View style={styles.tasksHeader}>
        <Ionicons name="list" size={20} color={colors.text.primary} />
        <Text style={styles.tasksTitle}>Current Goals</Text>
      </View>
      <View style={styles.tasksContent}>
        {/* Task 1 */}
        <View style={styles.taskItem}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>Daily Meditation</Text>
            <Text style={styles.taskProgress}>15/20 min</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <LinearGradient
              colors={[colors.primary.main, colors.primary.light]}
              style={[styles.progressBarFill, { width: '75%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Task 2 */}
        <View style={styles.taskItem}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>Focus Session</Text>
            <Text style={styles.taskProgress}>45/90 min</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <LinearGradient
              colors={[colors.primary.main, colors.primary.light]}
              style={[styles.progressBarFill, { width: '50%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Task 3 */}
        <View style={styles.taskItem}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>Stress Management</Text>
            <Text style={styles.taskProgress}>2/3 exercises</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <LinearGradient
              colors={[colors.primary.main, colors.primary.light]}
              style={[styles.progressBarFill, { width: '66%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const generateWeeklyMentalReadiness = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Generate labels for the past 6 hours with 2-hour gaps
  const labels = Array.from({ length: 7 }, (_, i) => {
    const hour = (currentHour - (i * 2) + 24) % 24; // Go back by 2-hour intervals
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
  }).reverse(); // Reverse to show oldest to newest

  // Generate random scores between 40 and 100 for all time points
  const data = Array.from({ length: 7 }, (_, i) => {
    if (i === 0) return 40; // Start low
    if (i === 1) return 65; // Quick improvement
    // Rest of the points fluctuate between 60 and 75
    return Math.floor(Math.random() * 15) + 60;
  });

  return { labels, data };
};

// Move getReadinessLevel outside component scope
const getReadinessLevel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Low';
};

const MentalReadinessHistory = () => {
  const navigation = useNavigation<NavigationProp>();
  const { labels, data } = generateWeeklyMentalReadiness();
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert to 12-hour format
  const lastUpdated = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  const handlePress = () => {
    navigation.navigate('MentalReadinessDetails', {
      data,
      labels,
      color: colors.primary.main,
      lastUpdated,
      score: data[data.length - 1],
      level: getReadinessLevel(data[data.length - 1])
    });
  };

  return (
    <Pressable onPress={handlePress} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="brain" size={20} color={colors.text.primary} />
          <Text style={styles.cardTitle}>Mental Readiness</Text>
        </View>
      </View>
      <MetricsGraph
        labels={labels}
        datasets={[
          {
            data,
            color: colors.primary.main,
            label: 'Mental Readiness',
          },
        ]}
        type="focus"
      />
    </Pressable>
  );
};

const TriMetricVisual = ({ focusValue, stressValue, mentalReadinessScore }: {
  focusValue: number,
  stressValue: number, 
  mentalReadinessScore: number
}) => {
  // Safe value conversion with fallbacks
  const safeFocusValue = isNaN(focusValue) ? 1.5 : Math.max(0, Math.min(3, focusValue));
  const safeStressValue = isNaN(stressValue) ? 1.5 : Math.max(0, Math.min(3, stressValue));
  const safeMentalReadiness = isNaN(mentalReadinessScore) ? 75 : Math.max(0, Math.min(100, mentalReadinessScore));

  return (
    <View style={styles.metricsCardContainer}>
      <View style={styles.metricsLayout}>
        {/* Left side - Focus */}
        <View style={styles.metricColumn}>
          <View style={styles.metricsCircleContainer}>
            <AnimatedCircularProgress
              size={70}
              width={5}
              fill={toPercentage(safeFocusValue)}
              tintColor="#4287f5"
              backgroundColor="#1E2A45"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <MaterialCommunityIcons name="crosshairs" size={22} color="#4287f5" />
              )}
            </AnimatedCircularProgress>
          </View>
          <Text style={styles.metricValue}>{safeFocusValue.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>FOCUS</Text>
        </View>
        
        {/* Center - Mental Readiness */}
        <View style={styles.centerMetricColumn}>
          <View style={styles.mentalReadinessCircleContainer}>
            <AnimatedCircularProgress
              size={90}
              width={6}
              fill={safeMentalReadiness}
              tintColor="#64B5F6"
              backgroundColor="#1E2A45"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <Text style={styles.mentalReadinessScore}>{safeMentalReadiness}%</Text>
              )}
            </AnimatedCircularProgress>
          </View>
          <Text style={styles.mentalReadinessLabel}>MENTAL READINESS</Text>
        </View>
        
        {/* Right side - Stress */}
        <View style={styles.metricColumn}>
          <View style={styles.metricsCircleContainer}>
            <AnimatedCircularProgress
              size={70}
              width={5}
              fill={toPercentage(safeStressValue)}
              tintColor="#FFA500"
              backgroundColor="#1E2A45"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <MaterialCommunityIcons name="lightning-bolt" size={22} color="#FFA500" />
              )}
            </AnimatedCircularProgress>
          </View>
          <Text style={styles.metricValue}>{safeStressValue.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>STRESS</Text>
        </View>
      </View>
      
      <View style={styles.insightContainer}>
        <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
        <Text style={styles.insightText}>
          Your focus peaks when stress is low. Consider taking breaks between 2-3 PM.
        </Text>
      </View>
    </View>
  );
};

const MetricsHeader = ({ focusValue, stressValue, mentalReadinessScore }: { 
  focusValue: number, 
  stressValue: number, 
  mentalReadinessScore: number
}) => {
  return (
    <TriMetricVisual
      focusValue={focusValue}
      stressValue={stressValue}
      mentalReadinessScore={mentalReadinessScore}
    />
  );
};

const Header = () => {
  const [isEarbudsConnected, setIsEarbudsConnected] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <Pressable 
          style={styles.headphonesButton}
          onPress={() => navigation.navigate('Bluetooth')}
        >
          <MaterialCommunityIcons 
            name={isEarbudsConnected ? "headphones" : "headphones-off"} 
            size={24} 
            color={isEarbudsConnected ? colors.primary.main : colors.text.secondary} 
          />
        </Pressable>
        <Text style={styles.headerSubtitle}>Track your mental state</Text>
      </View>
      <Pressable 
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <MaterialCommunityIcons name="account-circle" size={32} color={colors.text.primary} />
      </Pressable>
    </View>
  );
};

const ESP32_NAME = "ESP32-Focus-Stress-Monitor";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const FOCUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const STRESS_CHAR_UUID = "e70aafb5-a597-4347-b1af-a67c67a075c6";

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

const parseCharacteristicValue = (value: string): number[] => {
  return value.split(',').map(v => parseFloat(v));
};

// Comment out BLE-related type for now
// type BLEError = Error;

// Comment out BLE manager
// const bleManager = new BleManager();

// Detect if running on simulator
const isSimulator = () => {
  // Just use a simple approach that will work for our purposes
  return Platform.OS === 'ios' && __DEV__;
};

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [focusData, setFocusData] = useState<MetricsData>({ data: [], labels: [] });
  const [stressData, setStressData] = useState<MetricsData>({ data: [], labels: [] });
  const [mentalReadiness, setMentalReadiness] = useState<number>(75);
  const { demoMode, focusValue: demoFocusValue, stressValue: demoStressValue } = useDemo();
  
  const { 
    isScanning, 
    isConnected, 
    connectToDevice, 
    disconnectFromDevice, 
    focusValue: bleFocusValue, 
    stressValue: bleStressValue, 
    error: bleError, 
    lastUpdated: bleLastUpdated
  } = useBLE();
  
  const [todayMetrics, setTodayMetrics] = useState<MetricDataPoint[]>([]);
  const isOnSimulator = isSimulator();

  // Use either demo or BLE values with safe fallbacks
  const currentFocusValue = demoMode ? (demoFocusValue ?? 1.5) : (bleFocusValue ?? 1.5);
  const currentStressValue = demoMode ? (demoStressValue ?? 1.5) : (bleStressValue ?? 1.5);

  useEffect(() => {
    if (!demoMode && !isOnSimulator) {
      try {
        connectToDevice();
      } catch (error) {
        console.error('Error connecting to device:', error);
      }
    }
  }, [demoMode, isOnSimulator]);

  useEffect(() => {
    try {
      const currentValue = demoMode ? demoFocusValue : bleFocusValue;
      if (currentValue !== undefined) {
        const newData = [...focusData.data, currentValue];
        const now = new Date();
        const newLabel = `${now.getHours()}:${now.getMinutes()}`;
        const newLabels = [...focusData.labels, newLabel];
        
        // Keep only last 10 data points
        if (newData.length > 10) {
          newData.shift();
          newLabels.shift();
        }
        
        setFocusData({ data: newData, labels: newLabels });
      }
    } catch (error) {
      console.error('Error updating focus data:', error);
    }
  }, [demoMode ? demoFocusValue : bleFocusValue]);

  useEffect(() => {
    try {
      const currentValue = demoMode ? demoStressValue : bleStressValue;
      if (currentValue !== undefined) {
        const newData = [...stressData.data, currentValue];
        const now = new Date();
        const newLabel = `${now.getHours()}:${now.getMinutes()}`;
        const newLabels = [...stressData.labels, newLabel];
        
        // Keep only last 10 data points
        if (newData.length > 10) {
          newData.shift();
          newLabels.shift();
        }
        
        setStressData({ data: newData, labels: newLabels });
      }
    } catch (error) {
      console.error('Error updating stress data:', error);
    }
  }, [demoMode ? demoStressValue : bleStressValue]);

  useEffect(() => {
    const storeMetrics = async () => {
      if (!demoMode && (bleFocusValue !== undefined || bleStressValue !== undefined)) {
        try {
          if (bleFocusValue !== undefined) {
            await databaseService.storeReading({
              timestamp: new Date(),
              value: bleFocusValue,
              type: 'attention'
            });
          }
          
          if (bleStressValue !== undefined) {
            await databaseService.storeReading({
              timestamp: new Date(),
              value: bleStressValue,
              type: 'stress'
            });
          }
        } catch (error) {
          // Silently handle database errors - don't crash the component
          console.error('Error storing metrics:', error);
        }
      }
    };

    storeMetrics();
  }, [demoMode, bleFocusValue, bleStressValue]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Header />

        {bleError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{bleError}</Text>
          </View>
        )}

        <MetricsHeader 
          focusValue={currentFocusValue}
          stressValue={currentStressValue}
          mentalReadinessScore={mentalReadiness}
        />

        <RealTimeMetrics
          focusValue={currentFocusValue}
          stressValue={currentStressValue}
        />

        <TodaysMetrics
          focusData={focusData}
          stressData={stressData}
          focusValue={currentFocusValue}
          stressValue={currentStressValue}
        />

        <BestFocusTime />

        <MoodMusic />

        <Tasks />

        <MentalReadinessHistory />

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={isConnected ? disconnectFromDevice : connectToDevice}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Scanning...' : isConnected ? 'Disconnect Device' : 'Connect to Device'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 5,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: colors.error,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Best Focus Time styles
  bestFocusContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  bestFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bestFocusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
  },
  bestFocusContent: {
    alignItems: 'center',
  },
  timeChip: {
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  timeText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  bestFocusDescription: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  // Mood Music styles
  moodMusicContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  moodMusicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodMusicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
  },
  moodMusicContent: {
    alignItems: 'center',
  },
  musicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  musicInfo: {
    flex: 1,
  },
  musicType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  musicDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  // Tasks styles
  tasksContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
  },
  tasksContent: {
    gap: 12,
  },
  taskItem: {
    backgroundColor: colors.background.dark,
    borderRadius: 8,
    padding: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  taskProgress: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.background.dark,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Mental Readiness styles
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  cardHeader: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 8,
  },
  // Metrics styles
  metricsCardContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  metricsLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricColumn: {
    alignItems: 'center',
    flex: 1,
  },
  centerMetricColumn: {
    alignItems: 'center',
    flex: 1.5,
  },
  mentalReadinessScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  mentalReadinessLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Header styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headphonesButton: {
    padding: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  profileButton: {
    padding: 8,
  },
  // Metrics Header styles
  metricsHeader: {
    marginBottom: 20,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  metricsCircleContainer: {
    marginBottom: 8,
  },
  mentalReadinessCircleContainer: {
    marginBottom: 8,
  },
  realTimeMetricsContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  realTimeMetricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  speedometersContainer: {
    // Container style for SpeedometerMetrics component
  },
  todaysMetricsContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  todaysMetricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  currentValueContainer: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.background.dark,
  },
  currentLevel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  chartContainer: {
    marginBottom: 12,
  },
});

export default HomeScreen;