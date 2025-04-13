import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView } from 'react-native';
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
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { useBLE } from '../context/BLEContext';
import { logDebug } from '../utils/logger';

type Tab = 'focus' | 'stress' | 'mental';

type MetricsData = {
  data: number[];
  labels: string[];
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
  const lastUpdated = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

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
        lastUpdated={lastUpdated}
        status={{
          level: getReadinessLevel(data[data.length - 1]),
          value: data[data.length - 1]
        }}
      />
    </Pressable>
  );
};

const TriMetricVisual = ({ focusValue, stressValue, mentalReadinessScore, onPress }: {
  focusValue: number,
  stressValue: number, 
  mentalReadinessScore: number,
  onPress?: () => void
}) => {
  // Convert values to percentages (0-100)
  const focus = Math.round((focusValue / 3) * 100);
  const stress = Math.round((stressValue / 3) * 100);
  const mental = Math.round(mentalReadinessScore);
  
  // Calculate ring dimensions
  const ringSize = 70;
  const strokeWidth = 5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dashoffset based on percentage
  const getStrokeDashoffset = (percent: number) => {
    return circumference - (circumference * percent) / 100;
  };
  
  return (
    <Pressable 
      style={styles.metricsCardContainer}
      onPress={onPress}
    >
      <View style={styles.metricsLayout}>
        {/* Left side - Focus */}
        <View style={styles.metricColumn}>
          <View style={styles.metricsCircleContainer}>
            <AnimatedCircularProgress
              size={70}
              width={5}
              fill={toPercentage(focusValue)}
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
          <Text style={styles.metricValue}>{focusValue.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>FOCUS</Text>
        </View>
        
        {/* Center - Mental Readiness */}
        <View style={styles.centerMetricColumn}>
          <View style={styles.mentalReadinessCircleContainer}>
            <AnimatedCircularProgress
              size={90}
              width={6}
              fill={mentalReadinessScore}
              tintColor="#64B5F6"
              backgroundColor="#1E2A45"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <Text style={styles.mentalReadinessScore}>{mentalReadinessScore}%</Text>
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
              fill={toPercentage(stressValue)}
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
          <Text style={styles.metricValue}>{stressValue.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>STRESS</Text>
        </View>
      </View>
    </Pressable>
  );
};

const MetricsHeader = ({ focusValue, stressValue, mentalReadinessScore, onMetricsPress }: { 
  focusValue: number, 
  stressValue: number, 
  mentalReadinessScore: number,
  onMetricsPress: () => void
}) => {
  return (
    <View style={styles.metricsHeader}>
      <View style={styles.metricsContainer}>
        <TriMetricVisual
          focusValue={focusValue}
          stressValue={stressValue}
          mentalReadinessScore={mentalReadinessScore}
          onPress={onMetricsPress}
        />
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
  const [focusValue, setFocusValue] = useState(1.5);
  const [stressValue, setStressValue] = useState(1.5);
  const [isEarbudsConnected, setIsEarbudsConnected] = useState(false);
  const [mentalReadiness, setMentalReadiness] = useState<number>(75);
  const { demoMode, focusValue: demoFocusValue, stressValue: demoStressValue } = useDemo();
  
  // Add BLE context
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
  
  // Comment out BLE-related state
  // const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  // const [bleError, setBleError] = useState<string | null>(null);
  const isOnSimulator = isSimulator();

  // Add todayMetrics state
  interface MetricDataPoint {
    timestamp: Date;
    focus: number;
    stress: number;
  }
  
  const [todayMetrics, setTodayMetrics] = useState<MetricDataPoint[]>([]);
  
  useEffect(() => {
    if (!demoMode) {
      // Comment out BLE initialization for now so QR code will work
      /*
      const initializeBLE = async () => {
        try {
          // If on simulator, set a special error message or skip BLE initialization
          if (isOnSimulator) {
            // Only set this for development, so the simulator experience is cleaner
            if (__DEV__) {
              setBleError('BluetoothLE is unsupported on this device');
            }
            return;
          }

          // Request permissions first
          await requestPermissions();

          // Start scanning for ESP32
          bleManager.startDeviceScan(
            [SERVICE_UUID], 
            { allowDuplicates: false },
            (error: BleError | null, device: Device | null) => {
              if (error) {
                console.error('Scanning error:', error);
                setBleError(error.message);
                return;
              }

              if (device?.name === ESP32_NAME) {
                handleDiscoverDevice(device);
              }
            }
          );

        } catch (error: any) {
          console.error('BLE initialization error:', error);
          setBleError('Failed to initialize Bluetooth');
        }
      };

      initializeBLE();

      // Cleanup function
      return () => {
        if (!isOnSimulator) {
          bleManager.stopDeviceScan();
          if (connectedDevice) {
            bleManager.cancelDeviceConnection(connectedDevice.id);
          }
        }
      };
      */
    }
  }, [demoMode, isOnSimulator]);

  // Comment out the device handling function
  /*
  // Handle device discovery and connection
  const handleDiscoverDevice = async (device: Device) => {
    // ...device connection code...
  };
  */

  // Restore the useEffect for data updates in demo mode
  useEffect(() => {
    // Skip mock data generation when in demo mode
    if (demoMode) return;

    // Your existing demo mode data generation code
    const updateHistoricalData = () => {
      const focus = generateMockData(6);
      const stress = generateMockData(6);
      setFocusData(focus);
      setStressData(stress);
      setFocusValue(focus.data[focus.data.length - 1]);
      setStressValue(stress.data[stress.data.length - 1]);
    };

    updateHistoricalData();
    const historicalInterval = setInterval(updateHistoricalData, 60000);

    return () => {
      clearInterval(historicalInterval);
    };
  }, [demoMode]); // Add demoMode as a dependency

  // New effect to update metrics from demo values when in demo mode
  useEffect(() => {
    // Only update values when demo mode is active
    if (demoMode) {
      // Set the focus and stress values to match demo values
      setFocusValue(demoFocusValue);
      setStressValue(demoStressValue);
      
      // Update historical data to match demo trend
      // Generate 6 points of data that lead up to the current values
      const now = new Date();
      const labels = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setHours(now.getHours() - (5 - i));
        return `${d.getHours()}:00`;
      });
      
      // Generate focus data trending toward current demo value
      const focusDataPoints = Array.from({ length: 6 }, (_, i) => {
        // Start from a middle value and trend toward demo value
        const baseValue = 1.5;
        // Last point is the current demo value
        if (i === 5) return demoFocusValue;
        // Other points gradually move toward the demo value
        return baseValue + ((demoFocusValue - baseValue) * (i / 5));
      });
      
      // Generate stress data trending toward current demo value
      const stressDataPoints = Array.from({ length: 6 }, (_, i) => {
        // Start from a middle value and trend toward demo value
        const baseValue = 1.5;
        // Last point is the current demo value
        if (i === 5) return demoStressValue;
        // Other points gradually move toward the demo value
        return baseValue + ((demoStressValue - baseValue) * (i / 5));
      });
      
      // Update state with new trend data
      setFocusData({ data: focusDataPoints, labels });
      setStressData({ data: stressDataPoints, labels });
    }
  }, [demoMode, demoFocusValue, demoStressValue]);

  // Update focus and stress values based on BLE data
  useEffect(() => {
    if (isConnected && bleFocusValue !== undefined && bleStressValue !== undefined) {
      logDebug('Updating values from BLE', { focus: bleFocusValue, stress: bleStressValue });
      setFocusValue(bleFocusValue);
      setStressValue(bleStressValue);
      
      // Update history with new values
      const newDataPoint: MetricDataPoint = {
        timestamp: new Date(),
        focus: bleFocusValue,
        stress: bleStressValue
      };
      
      setTodayMetrics(prev => {
        const newMetrics = [...prev.slice(-5), newDataPoint];
        return newMetrics;
      });
      
      // Calculate mental readiness based on focus and stress
      const readiness = calculateMentalReadiness(bleFocusValue, bleStressValue);
      setMentalReadiness(readiness);
    }
  }, [isConnected, bleFocusValue, bleStressValue]);

  // Calculate mental readiness based on focus and stress values
  const calculateMentalReadiness = (focus: number, stress: number) => {
    // Higher focus and lower stress = better mental readiness
    const focusContribution = (focus / 3) * 60; // 60% weight to focus
    const stressContribution = ((3 - stress) / 3) * 40; // 40% weight to inverted stress
    return Math.round(focusContribution + stressContribution);
  };

  // Render BLE controls
  const renderBLEControls = () => {
    return (
      <View style={styles.bleControls}>
        {bleError ? (
          <Text style={styles.errorText}>{bleError}</Text>
        ) : null}
        
        {!isConnected ? (
          <Pressable 
            style={[styles.bleButton, isScanning && styles.bleButtonDisabled]}
            onPress={connectToDevice}
            disabled={isScanning}
          >
            <MaterialCommunityIcons 
              name={isScanning ? "bluetooth" : "bluetooth-off"} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.bleButtonText}>
              {isScanning ? 'Scanning...' : 'Connect ESP32'}
            </Text>
          </Pressable>
        ) : (
          <Pressable 
            style={styles.bleButton}
            onPress={disconnectFromDevice}
          >
            <MaterialCommunityIcons name="bluetooth" size={24} color="#fff" />
            <Text style={styles.bleButtonText}>Disconnect</Text>
          </Pressable>
        )}
        
        {bleLastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Last updated: {bleLastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient 
        colors={colors.background.gradient}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 1]}
      >
        {/* Comment out BLE error display
        {bleError && (!isOnSimulator || bleError !== 'BluetoothLE is unsupported on this device') && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{bleError}</Text>
          </View>
        )}
        */}
        
        {/* Remove simulator mode banner */}
        {/* isOnSimulator && (
          <View style={[styles.infoContainer, { backgroundColor: 'rgba(44, 62, 80, 0.7)' }]}>
            <Text style={styles.infoText}>Using simulator mode - Bluetooth features disabled</Text>
          </View>
        ) */}
        
        {/* Rest of your UI */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Header />
          <View style={styles.content}>
            <MetricsHeader 
              focusValue={focusValue}
              stressValue={stressValue}
              mentalReadinessScore={mentalReadiness}
              onMetricsPress={() => navigation.navigate('DetailedMetrics', {
                focusData: focusData.data,
                stressData: stressData.data,
                labels: focusData.labels,
                lastUpdated: new Date().toLocaleTimeString(),
                focusLevel: focusValue <= 1 ? 'Low' : focusValue <= 2 ? 'Medium' : 'High',
                focusValue: focusValue,
                stressLevel: stressValue <= 1 ? 'Low' : stressValue <= 2 ? 'Medium' : 'High',
                stressValue: stressValue,
                focusColor: colors.primary.main,
                stressColor: colors.error,
                mentalReadinessScore: mentalReadiness,
                mentalReadinessLevel: mentalReadiness <= 33 ? 'Low' : mentalReadiness <= 66 ? 'Medium' : 'Good',
                correlationData: {
                  highFocusHighStress: 25,
                  highFocusLowStress: 45,
                  lowFocusHighStress: 10,
                  lowFocusLowStress: 20
                },
                recommendations: [
                  'Your focus peaks when stress is low. Consider taking breaks between 2-3 PM.',
                  'Deep breathing exercises can help reduce stress and improve focus.',
                  'Consider a 20-minute walk to reset your mental state.'
                ]
              })}
            />
            
            {/* Real-time Speedometers */}
            <View style={styles.speedometersContainer}>
              <Text style={styles.sectionTitle}>Real-Time Metrics</Text>
              <SpeedometerMetrics
                focusValue={focusValue}
                stressValue={stressValue}
              />
            </View>

            {/* Add BLE controls right after the speedometers */}
            {renderBLEControls()}

            {/* Graph */}
            <View style={styles.graphContainer}>
              <Text style={styles.graphTitle}>Today's Metrics</Text>
              <MetricsGraph
                labels={focusData.labels}
                datasets={[
                  {
                    data: focusData.data,
                    color: colors.primary.main,
                    label: 'Focus'
                  },
                  {
                    data: stressData.data,
                    color: colors.error,
                    label: 'Stress'
                  }
                ]}
                lastUpdated={new Date().toLocaleTimeString()}
                status={{
                  level: focusValue <= 1 ? 'Low' : focusValue <= 2 ? 'Medium' : 'High',
                  value: focusValue
                }}
                type="focus"
              />
            </View>

            {/* Best Focus Time */}
            <BestFocusTime />

            {/* Mood Music */}
            <MoodMusic />
            <Tasks />
            <MentalReadinessHistory />

            {/* After the "Mental State Metrics" container, add the theme button */}
            <View style={[styles.themeCardContainer, { marginTop: 30 }]}>
              <Pressable 
                style={styles.card} 
                onPress={() => navigation.navigate('UIKit')}
              >
                <View style={styles.themeCardRow}>
                  <View style={styles.themeIconWrapper}>
                    <Ionicons name="color-palette" size={24} color={colors.primary.main} />
                  </View>
                  <View style={styles.themeTextWrapper}>
                    <Text style={styles.themeTitle}>Theme Explorer</Text>
                    <Text style={styles.themeDescription}>
                      View the updated UI components
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Base styles
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Header styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headphonesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },

  // Metrics styles
  metricsHeader: {
    marginBottom: 20,
  },
  metricsContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricsCardContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  metricsLayout: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricColumn: {
    width: '25%',
    alignItems: 'center',
  },
  centerMetricColumn: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsCircleContainer: {
    marginBottom: 8,
  },
  mentalReadinessCircleContainer: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#7a889e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mentalReadinessScore: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  mentalReadinessLabel: {
    fontSize: 12,
    color: '#7a889e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Graph styles
  graphContainer: {
    marginTop: 30,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },

  // Best Focus Time styles
  bestFocusContainer: {
    marginTop: 30,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bestFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bestFocusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  bestFocusContent: {
    alignItems: 'center',
  },
  timeChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 16,
  },
  timeText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  bestFocusDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Mood Music styles
  moodMusicContainer: {
    marginTop: 30,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  moodMusicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodMusicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  moodMusicContent: {
    width: '100%',
  },
  musicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
  },
  musicInfo: {
    flex: 1,
    marginRight: 20,
  },
  musicType: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  musicDescription: {
    fontSize: 15,
    color: colors.text.primary,
    opacity: 0.8,
    lineHeight: 22,
  },

  // Tasks styles
  tasksContainer: {
    marginTop: 30,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  tasksContent: {
    gap: 20,
  },
  taskItem: {
    gap: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  taskProgress: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Card styles
  card: {
    marginTop: 30,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },

  // Insight styles
  insightContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  insightText: {
    flex: 1,
    marginLeft: 10,
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Legend styles
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
  },

  speedometersContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // Demo mode styles
  demoModeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'red',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 999,
  },
  demoModeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Error styles
  errorContainer: {
    backgroundColor: colors.error,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    opacity: 0.9,
  },
  infoText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 13,
  },

  // New styles for the theme button
  themeCardContainer: {
    marginTop: 30,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  themeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  themeTextWrapper: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  themeDescription: {
    fontSize: 15,
    color: colors.text.secondary,
  },

  // New styles for the BLE controls
  bleControls: {
    marginTop: 16,
    alignItems: 'center',
  },
  bleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  bleButtonDisabled: {
    opacity: 0.6,
  },
  bleButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdatedText: {
    color: '#666',
    fontSize: 12,
  },
});

export default HomeScreen;