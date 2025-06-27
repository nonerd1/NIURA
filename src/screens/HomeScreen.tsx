import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, ClipPath, Circle, Text as SvgText, Rect, Polygon } from 'react-native-svg';
import MetricsGraph from '../components/MetricsGraph';
import SpeedometerMetrics from '../components/SpeedometerMetrics';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useDemo } from '../context/DemoContext';
import { NativeEventEmitter, NativeModules, PermissionsAndroid } from 'react-native';
import { EEGBLEService } from '../services/EEGBLEService';
import { logDebug } from '../utils/logger';
import { databaseService } from '../services/database';
import { eegService, Recommendation, MusicSuggestion, FocusTimeData } from '../services/eegService';
import { useGoals } from '../hooks/useGoals';
import { Goal, goalsService } from '../services/goalsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, RootTabParamList } from '../types/navigation';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

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

type TabNavigationProp = BottomTabNavigationProp<RootTabParamList, 'Home'>;
type StackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const BrainIcon = ({ score, size = 48, colors }: { score: number; size?: number; colors: any }) => {
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

const RealTimeMetrics = ({ focusValue, stressValue, styles }: { focusValue: number, stressValue: number, styles: any }) => {
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

const ESP32_NAME = "ESP32-Focus-Stress-Monitor";

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

const HomeScreen: React.FC = () => {
  const { colors, getScaledFontSize } = useTheme();
  const tabNavigation = useNavigation<TabNavigationProp>();
  const stackNavigation = useNavigation<StackNavigationProp>();
  const [focusData, setFocusData] = useState<MetricsData>({ data: [], labels: [] });
  const [stressData, setStressData] = useState<MetricsData>({ data: [], labels: [] });
  const [mentalReadiness, setMentalReadiness] = useState<number>(75);
  const [fallbackEEGData, setFallbackEEGData] = useState<any>({
    focusValue: 1.5,
    stressValue: 1.5,
    mentalReadiness: 75,
    source: 'default',
    isRecent: false,
    timeAgo: 'No recent data'
  });
  const { demoMode, focusValue: demoFocusValue, stressValue: demoStressValue } = useDemo();
  const { goals, isLoading } = useGoals();
  
  // EEG BLE Service state
  const [isEarbudsConnected, setIsEarbudsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [todayMetrics, setTodayMetrics] = useState<MetricDataPoint[]>([]);
  const isOnSimulator = isSimulator();

  // EEG BLE Service instance
  const eegBLEService = EEGBLEService.getInstance();

  // Add EEG data processing
  const [eegFocusValue, setEegFocusValue] = useState(1.5);
  const [eegStressValue, setEegStressValue] = useState(1.5);

  // Backend data states
  const [bestFocusTime, setBestFocusTime] = useState<FocusTimeData | null>(null);
  const [musicSuggestion, setMusicSuggestion] = useState<MusicSuggestion | null>(null);
  const [hourlyMentalReadiness, setHourlyMentalReadiness] = useState<{
    labels: string[];
    data: number[];
    totalSamples: number;
  }>({
    labels: ['9AM', '10AM', '11AM', '12PM'],
    data: [72, 75, 78, 75],
    totalSamples: 0
  });
  const [isLoadingBackendData, setIsLoadingBackendData] = useState(true);

  // Add backend data for Today's Metrics (12-hour data with 4-hour intervals)
  const [todaysMetricsData, setTodaysMetricsData] = useState<{
    focusData: number[];
    stressData: number[];
    labels: string[];
    lastUpdated: string;
  }>({
    focusData: [1.5, 1.5, 1.5, 1.5],
    stressData: [1.5, 1.5, 1.5, 1.5],
    labels: ['6AM', '10AM', '2PM', '6PM'],
    lastUpdated: 'No recent data'
  });

  // Add state for backend insight
  const [insightText, setInsightText] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(true);

  // Fetch backend insight on mount
  useEffect(() => {
    const fetchInsight = async () => {
      setIsLoadingInsight(true);
      try {
        const recs = await eegService.getRecommendations();
        if (recs && recs.length > 0) {
          setInsightText(recs[0].description || 'No insight available.');
        } else {
          setInsightText('No insight available.');
        }
      } catch (error) {
        setInsightText('Unable to load insight.');
      } finally {
        setIsLoadingInsight(false);
      }
    };
    fetchInsight();
  }, []);

  // Move styles inside component to access dynamic theme colors
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
      fontSize: getScaledFontSize(28),
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(14),
    },
    errorClose: {
      padding: 4,
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
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginBottom: 8,
    },
    metricValue: {
      fontSize: getScaledFontSize(24),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    actionButton: {
      backgroundColor: colors.primary.main,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(14),
      fontWeight: 'bold',
    },
    bestFocusDescription: {
      color: colors.text.secondary,
      fontSize: getScaledFontSize(14),
      textAlign: 'center',
    },
    confidenceText: {
      color: colors.text.secondary,
      fontSize: getScaledFontSize(12),
      marginTop: 8,
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
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(16),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    musicDescription: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
    },
    musicMood: {
      fontSize: getScaledFontSize(12),
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
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    tasksHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tasksTitle: {
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(14),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    taskProgress: {
      fontSize: getScaledFontSize(14),
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
    goalTrackingInfo: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      marginTop: 4,
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
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(20),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    mentalReadinessLabel: {
      fontSize: getScaledFontSize(12),
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
      fontSize: getScaledFontSize(14),
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
      fontSize: getScaledFontSize(14),
      color: colors.text.primary,
      marginLeft: 8,
    },
    scrollContent: {
      paddingBottom: 107,
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
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(16),
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
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
    },
    currentValueContainer: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.background.dark,
    },
    currentLevel: {
      fontSize: getScaledFontSize(14),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    chartContainer: {
      marginBottom: 12,
    },
    dataSourceIndicator: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 8,
    },
    tapToPlay: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      marginTop: 8,
    },
    playButton: {
      padding: 8,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.background.dark,
    },
    viewAllText: {
      fontSize: getScaledFontSize(12),
      fontWeight: 'bold',
      color: colors.primary.main,
      marginRight: 4,
    },
    manageGoalsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 12,
      borderRadius: 8,
      backgroundColor: colors.background.dark,
      borderWidth: 1,
      borderColor: colors.primary.main,
    },
    manageGoalsText: {
      fontSize: getScaledFontSize(14),
      fontWeight: '500',
      color: colors.primary.main,
      marginLeft: 8,
    },
    taskItemCompleted: {
      backgroundColor: colors.background.dark,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      opacity: 0.7,
    },
    completedBadge: {
      fontSize: getScaledFontSize(12),
      fontWeight: 'bold',
      color: colors.primary.main,
      marginLeft: 4,
    },
    loadingText: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      marginTop: 8,
    },
  });

  // Initialize EEG BLE service callbacks
  useEffect(() => {
    eegBLEService.setOnConnectionStatusChanged((isConnected: boolean) => {
      setIsEarbudsConnected(isConnected);
      setIsConnecting(false);
      if (isConnected) {
        setConnectionError(null);
      }
    });

    eegBLEService.setOnError((error: string) => {
      setConnectionError(error);
      setIsConnecting(false);
    });

    // Check initial connection status
    const status = eegBLEService.connectionStatus;
    setIsEarbudsConnected(status.isConnected);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Connect/disconnect handlers
  const handleConnectToEarbuds = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      await eegBLEService.connectToEarbuds();
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to connect to earbuds');
      setIsConnecting(false);
    }
  };

  const handleDisconnectFromEarbuds = async () => {
    try {
      await eegBLEService.disconnect();
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to disconnect from earbuds');
    }
  };

  // Process EEG data to derive focus and stress values
  const processEEGData = (eegData: any) => {
    if (!eegData || !eegData.records || eegData.records.length === 0) return;

    // Simple processing: use the latest EEG record
    const latestRecord = eegData.records[eegData.records.length - 1];
    const { eeg } = latestRecord;

    // Basic EEG processing to derive focus and stress
    // This is a simplified approach - you would normally use more sophisticated algorithms
    const avgAmplitude = eeg.reduce((sum: number, value: number) => sum + Math.abs(value), 0) / eeg.length;
    const variance = eeg.reduce((sum: number, value: number) => sum + Math.pow(value - avgAmplitude, 2), 0) / eeg.length;
    
    // Convert to 0-3 scale (simplified mapping)
    const focus = Math.min(3, Math.max(0, (avgAmplitude / 10000) * 3));
    const stress = Math.min(3, Math.max(0, (variance / 100000) * 3));
    
    setEegFocusValue(Number(focus.toFixed(1)));
    setEegStressValue(Number(stress.toFixed(1)));
    
    logDebug(`EEG processed - Focus: ${focus}, Stress: ${stress}`);
  };

  // Load fallback data on component mount
  useEffect(() => {
    loadFallbackEEGData();
    loadAllBackendData();
    
    // Refresh backend data every 30 seconds
    const interval = setInterval(() => {
      loadFallbackEEGData();
      loadAllBackendData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadFallbackEEGData = async () => {
    try {
      console.log('🧠 Attempting to fetch latest EEG data from backend...');
      const eegData = await eegService.getEEGDataWithFallback();
      
      console.log('Loaded fallback EEG data:', eegData);
      
      // Update the fallback EEG data state - this will be used by getDisplayValues()
      if (eegData.focusValue !== undefined && eegData.stressValue !== undefined) {
        
        // Calculate mental readiness (0-100%)
        const calculatedMentalReadiness = Math.round(((eegData.focusValue - eegData.stressValue + 3) / 6) * 100);
        
        console.log('🎯 Updating UI with EEG data:', {
          backend: { focus: eegData.focusValue, stress: eegData.stressValue },
          mentalReadiness: calculatedMentalReadiness,
          source: eegData.source,
          isRecent: eegData.isRecent,
          timeAgo: eegData.timeAgo
        });
        
        // Update the EEG values that are actually used by the components
        setEegFocusValue(eegData.focusValue);
        setEegStressValue(eegData.stressValue);
        
        // Update the fallback data state
        setFallbackEEGData({
          ...eegData,
          mentalReadiness: calculatedMentalReadiness
        });
        
        // Update mental readiness state
        setMentalReadiness(calculatedMentalReadiness);
        
      } else {
        console.log('⚠️ No valid EEG data found, using defaults');
      }
      
    } catch (error) {
      console.error('❌ Error loading EEG data:', error);
    }
  };

  const loadAllBackendData = async () => {
    try {
      setIsLoadingBackendData(true);
      
      // Load best focus time
      try {
        const focusTimeData = await eegService.getBestFocusTime();
        setBestFocusTime(focusTimeData);
      } catch (error) {
        console.error('Error loading best focus time:', error);
      }

      // Load music suggestion
      try {
        const musicSuggestions = await eegService.getMusicSuggestion();
        if (musicSuggestions && musicSuggestions.length > 0) {
          setMusicSuggestion(musicSuggestions[0]);
        }
      } catch (error) {
        console.error('Error loading music suggestions:', error);
      }

      // Load hourly mental readiness
      try {
        const hourlyData = await eegService.getEEGAggregate('hourly');
        
        if (hourlyData && hourlyData.data && hourlyData.data.length > 0) {
          // Transform backend data to mental readiness scores (0-100%)
          const mentalReadinessData = hourlyData.data.map(point => {
            const readiness = Math.round(((point.focus_avg - point.stress_avg + 3) / 6) * 100);
            return Math.max(0, Math.min(100, readiness));
          });
          
          // Generate proper hourly labels
          const now = new Date();
          const currentHour = now.getHours();
          const hoursToShow = Math.min(6, hourlyData.data.length);
          const hourlyLabels = [];
          
          for (let i = hoursToShow - 1; i >= 0; i--) {
            const hourTime = currentHour - i;
            const adjustedHour = hourTime < 0 ? hourTime + 24 : hourTime;
            const hour12 = adjustedHour === 0 ? 12 : adjustedHour > 12 ? adjustedHour - 12 : adjustedHour;
            const ampmLabel = adjustedHour >= 12 ? 'PM' : 'AM';
            hourlyLabels.push(`${hour12}${ampmLabel}`);
          }
          
          const recentData = mentalReadinessData.slice(-hoursToShow);
          
          setHourlyMentalReadiness({
            labels: hourlyLabels,
            data: recentData,
            totalSamples: hourlyData.total_samples || 0
          });
        }
      } catch (error) {
        console.error('Error loading mental readiness data:', error);
      }

      // Load Today's Metrics data (12-hour data with 4-hour intervals)
      try {
        const dailyData = await eegService.getEEGAggregate('daily');
        
        if (dailyData && dailyData.data && dailyData.data.length > 0) {
          // Get the last 4 data points (representing 4-hour intervals over 12 hours)
          const recentData = dailyData.data.slice(-4);
          
          // Generate proper 4-hour interval labels
          const now = new Date();
          const labels = [];
          const focusData = [];
          const stressData = [];
          
          for (let i = 3; i >= 0; i--) {
            const hourTime = now.getHours() - (i * 4);
            const adjustedHour = hourTime < 0 ? hourTime + 24 : hourTime;
            const hour12 = adjustedHour === 0 ? 12 : adjustedHour > 12 ? adjustedHour - 12 : adjustedHour;
            const ampmLabel = adjustedHour >= 12 ? 'PM' : 'AM';
            labels.push(`${hour12}${ampmLabel}`);
            
            // Use backend data if available, otherwise use fallback values
            if (recentData[i]) {
              focusData.push(recentData[i].focus_avg !== undefined ? recentData[i].focus_avg : 1.5);
              stressData.push(recentData[i].stress_avg !== undefined ? recentData[i].stress_avg : 1.5);
            } else {
              focusData.push(1.5);
              stressData.push(1.5);
            }
          }
          
          setTodaysMetricsData({
            focusData,
            stressData,
            labels,
            lastUpdated: 'Recent data'
          });
        }
      } catch (error) {
        console.error('Error loading Today\'s Metrics data:', error);
        // Fallback to current values with proper labels
        const now = new Date();
        const labels = [];
        for (let i = 3; i >= 0; i--) {
          const hourTime = now.getHours() - (i * 4);
          const adjustedHour = hourTime < 0 ? hourTime + 24 : hourTime;
          const hour12 = adjustedHour === 0 ? 12 : adjustedHour > 12 ? adjustedHour - 12 : adjustedHour;
          const ampmLabel = adjustedHour >= 12 ? 'PM' : 'AM';
          labels.push(`${hour12}${ampmLabel}`);
        }
        
        setTodaysMetricsData({
          focusData: [1.5, 1.5, 1.5, 1.5],
          stressData: [1.5, 1.5, 1.5, 1.5],
          labels,
          lastUpdated: 'Using fallback data'
        });
      }
      
    } catch (error) {
      console.error('Error loading backend data:', error);
    } finally {
      setIsLoadingBackendData(false);
    }
  };

  // Determine which values to use with smart fallback logic
  const getDisplayValues = () => {
    // Always prioritize backend data when available and recent
    if (fallbackEEGData && fallbackEEGData.source === 'backend' && fallbackEEGData.isRecent) {
      return {
        focusValue: fallbackEEGData.focusValue || 1.5,
        stressValue: fallbackEEGData.stressValue || 1.5,
        mentalReadiness: fallbackEEGData.mentalReadiness || 75,
        source: 'backend',
        lastUpdated: fallbackEEGData.timeAgo || 'Just now'
      };
    }
    
    // If connected to earbuds, use live data
    if (isEarbudsConnected && (eegFocusValue > 0 || eegStressValue > 0)) {
      return {
        focusValue: eegFocusValue,
        stressValue: eegStressValue,
        mentalReadiness: mentalReadiness,
        source: 'live',
        lastUpdated: 'Live'
      };
    }
    
    // Fallback to default or stored backend data
    return {
      focusValue: (fallbackEEGData && fallbackEEGData.focusValue) || eegFocusValue || 1.5,
      stressValue: (fallbackEEGData && fallbackEEGData.stressValue) || eegStressValue || 1.5,
      mentalReadiness: (fallbackEEGData && fallbackEEGData.mentalReadiness) || mentalReadiness || 75,
      source: (fallbackEEGData && fallbackEEGData.source) || 'default',
      lastUpdated: (fallbackEEGData && fallbackEEGData.timeAgo) || 'No recent data'
    };
  };

  const displayValues = getDisplayValues();
  const currentFocusValue = displayValues.focusValue;
  const currentStressValue = displayValues.stressValue;

  useEffect(() => {
    if (!demoMode && !isOnSimulator) {
      try {
        handleConnectToEarbuds();
      } catch (error) {
        console.error('Error connecting to device:', error);
      }
    }
  }, [demoMode, isOnSimulator]);

  useEffect(() => {
    try {
      const currentValue = demoMode ? demoFocusValue : eegFocusValue;
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
  }, [demoMode ? demoFocusValue : eegFocusValue]);

  useEffect(() => {
    try {
      const currentValue = demoMode ? demoStressValue : eegStressValue;
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
  }, [demoMode ? demoStressValue : eegStressValue]);

  useEffect(() => {
    const storeMetrics = async () => {
      if (!demoMode && (eegFocusValue !== undefined || eegStressValue !== undefined)) {
        try {
          if (eegFocusValue !== undefined) {
            await databaseService.storeReading({
              timestamp: new Date(),
              value: eegFocusValue,
              type: 'attention'
            });
          }
          
          if (eegStressValue !== undefined) {
            await databaseService.storeReading({
              timestamp: new Date(),
              value: eegStressValue,
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
  }, [demoMode, eegFocusValue, eegStressValue]);

  // NEW: Monitor focus and stress values for threshold alerts
  useEffect(() => {
    const checkThresholds = async () => {
      const displayValues = getDisplayValues();
      const { focusValue, stressValue } = displayValues;
      
      // Only check thresholds if we have valid values and they're not default fallback values
      if (focusValue > 0 && stressValue > 0 && displayValues.source !== 'default') {
        try {
          await notificationService.checkThresholdAlerts(focusValue, stressValue);
        } catch (error) {
          console.error('Error checking threshold alerts:', error);
        }
      }
    };

    // Check thresholds every time the values change
    checkThresholds();
  }, [eegFocusValue, eegStressValue, fallbackEEGData]);

  const handlePlayMusic = () => {
    Alert.alert('Music Feature', 'Music integration coming soon!');
  };

  // Handle navigation to Detailed Metrics Screen
  const handleNavigateToDetailedMetrics = () => {
    const focusLevel = currentFocusValue >= 2.5 ? 'HIGH' : currentFocusValue >= 1.5 ? 'MEDIUM' : 'LOW';
    const stressLevel = currentStressValue >= 2.5 ? 'HIGH' : currentStressValue >= 1.5 ? 'MEDIUM' : 'LOW';
    stackNavigation.navigate('DetailedMetrics', {
      focusData: todaysMetricsData.focusData,
      stressData: todaysMetricsData.stressData,
      labels: todaysMetricsData.labels,
      lastUpdated: todaysMetricsData.lastUpdated,
      focusLevel,
      focusValue: currentFocusValue,
      stressLevel,
      stressValue: currentStressValue,
      focusColor: '#4287f5',
      stressColor: '#FFA500',
      mentalReadinessScore: mentalReadiness,
      mentalReadinessLevel: mentalReadiness >= 80 ? 'EXCELLENT' : mentalReadiness >= 60 ? 'GOOD' : mentalReadiness >= 40 ? 'FAIR' : 'LOW',
      correlationData: {
        highFocusHighStress: 0,
        highFocusLowStress: 0,
        lowFocusHighStress: 0,
        lowFocusLowStress: 0
      },
      recommendations: []
    });
  };

  // Handle navigation to Mental Readiness Details Screen
  const handleNavigateToMentalReadinessDetails = () => {
    const mentalReadinessLevel = mentalReadiness >= 80 ? 'EXCELLENT' : mentalReadiness >= 60 ? 'GOOD' : mentalReadiness >= 40 ? 'FAIR' : 'LOW';
    stackNavigation.navigate('MentalReadinessDetails', {
      data: hourlyMentalReadiness.data,
      labels: hourlyMentalReadiness.labels,
      color: colors.primary.main,
      lastUpdated: hourlyMentalReadiness.totalSamples > 0 ? 'Recent data' : 'No recent data',
      score: mentalReadiness,
      level: mentalReadinessLevel
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <Pressable 
              style={styles.headphonesButton}
              onPress={() => stackNavigation.navigate('Bluetooth')}
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
            onPress={() => stackNavigation.navigate('Profile')}
          >
            <MaterialCommunityIcons name="account-circle" size={32} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Connection Error Display */}
        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{connectionError}</Text>
            <TouchableOpacity 
              onPress={() => setConnectionError(null)}
              style={styles.errorClose}
            >
              <Ionicons name="close" size={16} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Simple metrics display */}
        <View style={styles.metricsCardContainer}>
          <View style={styles.metricsLayout}>
            {/* Left side - Focus */}
            <View style={styles.metricColumn}>
              <View style={styles.metricsCircleContainer}>
                <AnimatedCircularProgress
                  size={70}
                  width={5}
                  fill={toPercentage(currentFocusValue)}
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
              <Text style={styles.metricValue}>{currentFocusValue.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>FOCUS</Text>
            </View>
            
            {/* Center - Mental Readiness */}
            <View style={styles.centerMetricColumn}>
              <View style={styles.mentalReadinessCircleContainer}>
                <AnimatedCircularProgress
                  size={90}
                  width={6}
                  fill={mentalReadiness}
                  tintColor="#64B5F6"
                  backgroundColor="#1E2A45"
                  rotation={0}
                  lineCap="round"
                >
                  {() => (
                    <Text style={styles.mentalReadinessScore}>{mentalReadiness}%</Text>
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
                  fill={toPercentage(currentStressValue)}
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
              <Text style={styles.metricValue}>{currentStressValue.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>STRESS</Text>
            </View>
          </View>
          
          <View style={styles.insightContainer}>
            <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
            <Text style={styles.insightText}>
              {isLoadingInsight ? 'Loading insight...' : insightText}
            </Text>
          </View>
        </View>

        <RealTimeMetrics
          focusValue={currentFocusValue}
          stressValue={currentStressValue}
          styles={styles}
        />

        {/* Today's Metrics with real backend data */}
        <View style={styles.todaysMetricsContainer}>
          <Text style={styles.todaysMetricsTitle}>Today's Metrics</Text>
          <View style={styles.chartHeader}>
            <Text style={styles.lastUpdated}>
              {todaysMetricsData.lastUpdated !== 'No recent data' 
                ? `Last updated ${todaysMetricsData.lastUpdated}` 
                : 'Loading...'}
            </Text>
            <View style={styles.currentValueContainer}>
              <Text style={[styles.currentLevel, { color: '#4287f5' }]}>
                {currentFocusValue >= 2.5 ? 'HIGH' : currentFocusValue >= 1.5 ? 'MEDIUM' : 'LOW'} {currentFocusValue.toFixed(1)}
              </Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            <MetricsGraph
              labels={todaysMetricsData.labels}
              datasets={[
                {
                  data: todaysMetricsData.focusData,
                  color: '#4287f5',
                  label: 'Focus',
                },
                {
                  data: todaysMetricsData.stressData,
                  color: '#FFA500',
                  label: 'Stress',
                },
              ]}
              type="focus"
              hideHeader={true}
              onPress={handleNavigateToDetailedMetrics}
            />
          </View>
          <Text style={styles.dataSourceIndicator}>
            {todaysMetricsData.lastUpdated === 'Recent data' ? 'Showing real backend data' : 
             todaysMetricsData.lastUpdated === 'Using fallback data' ? 'Using fallback data' : 
             'Loading...'} - 4hr intervals
          </Text>
        </View>

        {/* Best Focus Time */}
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
              <Text style={styles.timeText}>
                {bestFocusTime 
                  ? eegService.formatTimeRange(bestFocusTime.best_time_start, bestFocusTime.best_time_end)
                  : isLoadingBackendData ? 'Loading...' : '10:00 AM - 12:00 PM'}
              </Text>
            </LinearGradient>
            <Text style={styles.bestFocusDescription}>
              {bestFocusTime
                ? `Based on your focus patterns, you're most productive during these hours (${bestFocusTime.focus_score}% focus score)`
                : "Based on your focus patterns, you're most productive during these hours"}
            </Text>
            {bestFocusTime && (
              <Text style={styles.confidenceText}>
                Confidence: {bestFocusTime.confidence}%
              </Text>
            )}
          </View>
        </View>

        {/* Music for You */}
        <View style={styles.moodMusicContainer}>
          <View style={styles.moodMusicHeader}>
            <Ionicons name="musical-notes" size={20} color={colors.text.primary} />
            <Text style={styles.moodMusicTitle}>Music for You</Text>
          </View>
          <View style={styles.moodMusicContent}>
            <TouchableOpacity onPress={handlePlayMusic}>
              <LinearGradient
                colors={[colors.primary.main, colors.primary.light]}
                style={styles.musicCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.musicInfo}>
                  <Text style={styles.musicType}>
                    {musicSuggestion?.title || (isLoadingBackendData ? 'Loading...' : 'Focus Beats')}
                  </Text>
                  <Text style={styles.musicDescription}>
                    {musicSuggestion?.artist || musicSuggestion?.genre || 'Lo-fi beats to help you concentrate'}
                  </Text>
                  {musicSuggestion?.recommended_for && (
                    <Text style={styles.musicMood}>
                      For {musicSuggestion.recommended_for}
                    </Text>
                  )}
                  <Text style={styles.tapToPlay}>Tap to play or get suggestion</Text>
                </View>
                <View style={styles.playButton}>
                  <Ionicons 
                    name="play-circle" 
                    size={36} 
                    color={colors.text.primary} 
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Goals */}
        <View style={styles.tasksContainer}>
          <View style={styles.tasksHeader}>
            <View style={styles.tasksHeaderLeft}>
              <Ionicons name="list" size={20} color={colors.text.primary} />
              <Text style={styles.tasksTitle}>Current Goals</Text>
            </View>
            <Pressable
              style={styles.viewAllButton}
              onPress={() => tabNavigation.navigate('Calendar', { scrollTo: 'goals' })}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary.main} />
            </Pressable>
          </View>
          <View style={styles.tasksContent}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading goals...</Text>
            ) : goals && goals.length > 0 ? (
              goals.slice(0, 3).map((goal) => {
                const progress = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
                return (
                  <View key={goal.id} style={styles.taskItem}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{goal.name}</Text>
                      <Text style={styles.taskProgress}>
                        {goal.current}/{goal.target} {goal.unit}
                      </Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <LinearGradient
                        colors={[colors.primary.main, colors.primary.light]}
                        style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={styles.goalTrackingInfo}>
                      Tracking: {goal.trackingType || 'progress'}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.loadingText}>No goals found. Set up your first goal in the Calendar screen!</Text>
            )}
          </View>
        </View>

        {/* Mental Readiness History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="brain" size={20} color={colors.text.primary} />
              <Text style={styles.cardTitle}>Mental Readiness History</Text>
            </View>
            {isLoadingBackendData && (
              <Text style={styles.loadingText}>Loading...</Text>
            )}
          </View>
          <MetricsGraph
            labels={hourlyMentalReadiness.labels}
            datasets={[
              {
                data: hourlyMentalReadiness.data,
                color: colors.primary.main,
                label: 'Mental Readiness',
              },
            ]}
            type="mental"
            yAxisMax={100}
            yAxisSegments={5}
            yAxisLabels={[0, 20, 40, 60, 80, 100]}
            onPress={handleNavigateToMentalReadinessDetails}
          />
          <Text style={styles.dataSourceIndicator}>
            {hourlyMentalReadiness.totalSamples > 0 
              ? `Real data (${hourlyMentalReadiness.totalSamples} samples)` 
              : 'Hourly mental readiness tracking'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={isEarbudsConnected ? handleDisconnectFromEarbuds : handleConnectToEarbuds}
        >
          <Text style={styles.buttonText}>
            {isConnecting ? 'Connecting to Earbuds...' : isEarbudsConnected ? 'Disconnect Earbuds' : 'Connect to EEG Earbuds'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;