import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import DeepWorkHistory from '../components/DeepWorkHistory';
import SpeedometerMetrics from '../components/SpeedometerMetrics';
import Svg, { Circle, LinearGradient as SvgLinearGradient, Defs, Stop } from 'react-native-svg';
import { useDemo } from '../context/DemoContext';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
// Add session service imports
import { useSession } from '../hooks/useSession';
import { sessionService, SessionLabel } from '../services/sessionService';
import { useTasks } from '../hooks/useTasks';
import { tasksService, CreateTaskRequest, Task } from '../services/tasksService';

// Updated color theme
const darkTheme = {
  background: {
    primary: colors.background.dark,     // Use global dark blue
    secondary: colors.background.card,   // Use global card background
    card: colors.background.card,        // Use global card background
  },
  primary: {
    main: colors.primary.main,        // Use global primary color
  },
  text: {
    primary: colors.text.primary,     // Use global text color
    secondary: colors.text.secondary,   // Use global secondary text color
  }
};

// Circle constants for the progress ring
const SCREEN_WIDTH = Dimensions.get('window').width;
const CIRCLE_SIZE = SCREEN_WIDTH * 0.8; // 80% of screen width
const RADIUS = CIRCLE_SIZE / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * (RADIUS - 10); // 10px inset for stroke width
const STROKE_WIDTH = 12; // Thicker stroke for better visual impact

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PickerOption {
  label: string;
  value: string;
}

interface NumberPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  options: PickerOption[];
  label: string;
  disabled?: boolean;
}

const NumberPicker = ({ value, onValueChange, options, label, disabled }: NumberPickerProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.pickerWrapper}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity 
        style={[styles.pickerButton, disabled && styles.pickerButtonDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.pickerButtonText, disabled && styles.pickerButtonTextDisabled]}>
          {value.toString().padStart(2, '0')}
        </Text>
      </TouchableOpacity>
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView>
              {options.map((option: PickerOption) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => {
                    onValueChange(parseInt(option.value, 10));
                    setIsVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    value === parseInt(option.value, 10) && styles.modalOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Type for navigation
type NavigationProp = StackNavigationProp<RootStackParamList>;

// Main DeepWorkScreen Component
const DeepWorkScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'history'>('timer');
  
  // Session management with backend integration
  const {
    currentSession,
    isSessionActive,
    sessionDuration: liveSessionDuration,
    sessionStats,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    addEEGReading,
    isLoading: sessionLoading,
    error: sessionError
  } = useSession();
  
  // STATE FOR TIMER TAB
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(15); // Set to 15 seconds for easier testing
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15); // Set to 15 seconds
  const [progress] = useState(new Animated.Value(0));
  const [hasStarted, setHasStarted] = useState(false);
  
  // Session configuration state
  const [sessionName, setSessionName] = useState('');
  const [sessionType, setSessionType] = useState<'focus' | 'meditation' | 'study' | 'break' | 'custom'>('focus');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<SessionLabel[]>([]);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  
  // New state to track distractions and session data
  const [distractionCount, setDistractionCount] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [focusHistory, setFocusHistory] = useState<number[]>([]); // Empty initial array instead of sample data
  const [stressHistory, setStressHistory] = useState<number[]>([]); // Empty initial array instead of sample data

  // DEBUG FLAG
  const [debugMessage, setDebugMessage] = useState<string>('');
  
  // Combined metrics state
  const [metrics, setMetrics] = useState<{ focus: number; stress: number }>({
    focus: 1.2,
    stress: 1.5
  });

  // Get demo values from context - update to get both demoMode flag and the focus/stress values
  const { demoMode, focusValue: demoFocusValue, stressValue: demoStressValue, timerStarted, timerEnded } = useDemo();

  // Tasks integration with backend
  const {
    tasks,
    pendingTasks,
    completedTasks,
    createTask,
    updateTask,
    deleteTask: removeTask,
    toggleTaskCompletion,
    refreshTasks,
    isLoading: tasksLoading,
    error: tasksError,
    stats: taskStats
  } = useTasks({ session_id: currentSession?.id });

  // STATE FOR TASKS TAB
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Load session labels on component mount
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const labels = await sessionService.getSessionLabels();
        setAvailableLabels(labels);
      } catch (error: any) {
        // Don't log or treat as error if it's the expected "Method Not Allowed" for session labels
        if (error.message?.includes('Method Not Allowed')) {
          console.log('Session labels endpoint only supports POST, using default labels');
        } else {
          console.error('Error loading session labels:', error);
        }
        // Use default labels as fallback
        setAvailableLabels(sessionService.getDefaultLabels());
      }
    };

    loadLabels();
  }, []);

  // Sync session state with backend
  useEffect(() => {
    if (currentSession) {
      setHasStarted(true);
      setIsRunning(isSessionActive);
      setSessionName(currentSession.name);
      setSessionType(currentSession.session_type);
      setSelectedLabels(currentSession.labels.map(label => typeof label.id === 'string' ? label.id : label.id.toString()));
    } else {
      setHasStarted(false);
      setIsRunning(false);
    }
  }, [currentSession, isSessionActive]);

  // Add EEG readings to session when metrics update
  useEffect(() => {
    if (isSessionActive && currentSession && isRunning) {
      // Add current metrics as EEG reading
      addEEGReading(metrics.focus, metrics.stress);
    }
  }, [metrics, isSessionActive, currentSession, isRunning, addEEGReading]);

  // Update metrics from session stats
  useEffect(() => {
    if (sessionStats && sessionStats.readingsCount > 0) {
      setMetrics({
        focus: sessionStats.averageFocus,
        stress: sessionStats.averageStress
      });
    }
  }, [sessionStats]);

  // Function to navigate to summary screen directly (for testing)
  const goToSummaryScreen = useCallback(() => {
    setDebugMessage('Manual navigation test');
    
    // Use the configured time instead of an arbitrary value
    const configuredDuration = (hours * 3600) + (minutes * 60) + seconds;
    
    // Simple navigation with test data
    navigation.navigate('SessionSummary', {
      duration: configuredDuration,
      focusData: [1.2, 1.4, 1.6, 1.8, 2.0],
      stressData: [1.5, 1.3, 1.4, 1.2, 1.0],
      distractionCount: 2,
      completedTasks: 1,
      totalTasks: 3
    });
  }, [navigation, hours, minutes, seconds]);

  // New ref to track if timer is being initialized
  const initializing = useRef(false);

  // Timer Tab Logic
  useEffect(() => {
    if (!initializing.current) {
      const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
      setTimeRemaining(totalSeconds);
      progress.setValue(0);
      setHasStarted(false);
    }
  }, [hours, minutes, seconds]);

  // Add refs to track timer intervals
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // New effect to update metrics based on demo values when demo mode is active
  useEffect(() => {
    // Only update metrics from demo values when demo mode is active and timer is running
    if (demoMode && isRunning) {
      // Set metrics directly from demo values
      setMetrics({
        focus: demoFocusValue,
        stress: demoStressValue
      });
      
      // Also update the history arrays with the current demo values
      setFocusHistory(prev => {
        // Only add the value if it's different from the last one
        if (prev.length === 0 || prev[prev.length - 1] !== demoFocusValue) {
          return [...prev, demoFocusValue];
        }
        return prev;
      });
      
      setStressHistory(prev => {
        // Only add the value if it's different from the last one
        if (prev.length === 0 || prev[prev.length - 1] !== demoStressValue) {
          return [...prev, demoStressValue];
        }
        return prev;
      });
    }
  }, [demoMode, demoFocusValue, demoStressValue, isRunning]);

  // Modify the timer effect to only update metrics when NOT in demo mode
  useEffect(() => {
    console.log('Timer setup/cleanup effect triggered. isRunning:', isRunning);
    
    // Only set up timer when starting
    if (isRunning && !timerIntervalRef.current) {
      console.log('Setting up new timer interval');
      
      // Mark as initializing to prevent duplicate timer setup
      initializing.current = true;
      
      // If this is the first time running, set the session start time
      if (sessionStartTime === null) {
        setSessionStartTime(Date.now());
        setSessionDuration(0);
        // Only set initial metrics at start if not in demo mode
        if (!demoMode) {
          console.log('Initializing metrics history with first value:', metrics.focus.toFixed(2), metrics.stress.toFixed(2));
          // Start with current metrics as first data point
          setFocusHistory([metrics.focus]);
          setStressHistory([metrics.stress]);
        }
      }
      
      // Create the timer interval that stays alive until cleaned up
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newValue = Math.max(0, prev - 1);
          setDebugMessage(`Time remaining: ${newValue}s`);
          
          // When timer reaches zero
          if (newValue === 0) {
            // Clear the interval
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            
            // Stop the timer
            setIsRunning(false);
            setDebugMessage('Timer finished! Ending session...');
            
            // End the backend session
            const handleSessionEnd = async () => {
              try {
                if (isSessionActive && currentSession) {
                  console.log('Ending backend session...');
                  const success = await endSession();
                  
                  if (success) {
                    console.log('Session ended successfully');
                  } else {
                    console.error('Failed to end session properly');
                  }
                }
              } catch (error) {
                console.error('Error ending session:', error);
              }
            };
            
            handleSessionEnd();
            
            // Use the configured duration instead of calculating elapsed time
            const configuredDuration = (hours * 3600) + (minutes * 60) + seconds;
            setSessionDuration(configuredDuration);
            
            // Ensure we have at least some data points for the summary
            console.log(`Session complete. Data points collected - Focus: ${focusHistory.length}, Stress: ${stressHistory.length}`);
            
            // Use real session data if available, otherwise fallback
            const finalFocusData = sessionStats && sessionStats.readingsCount > 0 
              ? (focusHistory.length >= 2 ? focusHistory : [sessionStats.averageFocus, sessionStats.peakFocus])
              : (focusHistory.length >= 2 ? focusHistory : 
                 (focusHistory.length === 1 ? [...focusHistory, focusHistory[0] + 0.2] : [1.2, 1.4, 1.6, 1.8, 2.0]));
            
            const finalStressData = sessionStats && sessionStats.readingsCount > 0
              ? (stressHistory.length >= 2 ? stressHistory : [sessionStats.averageStress, sessionStats.averageStress - 0.2])
              : (stressHistory.length >= 2 ? stressHistory : 
                 (stressHistory.length === 1 ? [...stressHistory, stressHistory[0] - 0.1] : [1.5, 1.3, 1.4, 1.2, 1.0]));
            
            // Navigate to summary screen with real session data
            navigation.navigate('SessionSummary', {
              duration: configuredDuration,
              focusData: finalFocusData,
              stressData: finalStressData,
              distractionCount: distractionCount,
              completedTasks: tasks.filter(task => task.completed).length,
              totalTasks: tasks.length,
              // Add session information
              sessionName: currentSession?.name || sessionName || 'Untitled Session',
              sessionType: currentSession?.session_type || sessionType,
              sessionStats: sessionStats ? {
                averageFocus: sessionStats.averageFocus,
                averageStress: sessionStats.averageStress,
                peakFocus: sessionStats.peakFocus,
                focusTimePercentage: sessionStats.focusTimePercentage,
                readingsCount: sessionStats.readingsCount
              } : undefined
            });
            
            if (demoMode) {
              timerEnded && timerEnded();
            }
          }
          
          return newValue;
        });
      }, 1000);
      
      // Calculate the total duration for the progress animation
      const totalDuration = timeRemaining * 1000;
      
      // Use a single animation for the progress circle
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: totalDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      
      animation.start();
      
      // Setup metrics interval separately - ONLY when NOT in demo mode
      if (!metricsIntervalRef.current && !demoMode) {
        console.log('Setting up metrics interval (normal mode)');
        metricsIntervalRef.current = setInterval(() => {
          // Update metrics with small random changes - ONLY for non-demo mode
          const newFocusValue = Math.max(0.5, Math.min(2.8, metrics.focus + (Math.random() * 0.2 - 0.1)));
          const newStressValue = Math.max(0.5, Math.min(2.8, metrics.stress + (Math.random() * 0.2 - 0.1)));
          
          console.log('Regular metrics update:', newFocusValue.toFixed(2), newStressValue.toFixed(2));
          
          // Update current metrics state
          setMetrics({
            focus: newFocusValue,
            stress: newStressValue
          });
          
          // Add new values to history - these will be shown on the summary screen
          setFocusHistory(prev => [...prev, newFocusValue]);
          setStressHistory(prev => [...prev, newStressValue]);
          
          // Log the current history length for debugging
          console.log(`Metrics history updated: Focus history (${focusHistory.length + 1} points), Stress history (${stressHistory.length + 1} points)`);
        }, 3000); // Update every 3 seconds instead of 5 for more data points
      }
    } else if (!isRunning) {
      // Reset initialization state when timer stops/pauses
      initializing.current = false;
      
      // Clear timer when stopped
      console.log('Timer paused or stopped - cleaning up intervals');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      progress.stopAnimation();
    }

    // Cleanup function - runs only when isRunning changes or component unmounts
    return () => {
      console.log('Timer effect cleanup - ONE TIME ONLY');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
    };
  // Reduce the dependency array to only essential dependencies
  }, [isRunning, demoMode, hours, minutes, seconds, navigation, progress, timeRemaining]);

  // Timer Tab Helpers
  const formatTime = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const progressStrokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0],
  });

  // Pulse animation for the timer text
  const [pulseAnim] = useState(new Animated.Value(1));
  
  useEffect(() => {
    let pulseAnimationId: Animated.CompositeAnimation | null = null;
    
    if (isRunning && timeRemaining <= 10 && timeRemaining > 0) {
      // Create a pulse animation when timer is about to end
      pulseAnimationId = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
          })
        ])
      );
      
      pulseAnimationId.start();
    } else {
      // Reset to normal size when not in final countdown
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
    
    return () => {
      if (pulseAnimationId) {
        pulseAnimationId.stop();
      }
    };
  }, [isRunning, timeRemaining]);

  const hourOptions = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i.toString()
  })), []);

  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i.toString()
  })), []);

  const secondOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i.toString()
  })), []);

  // Timer Tab Actions
  const handleStartTimer = useCallback(async () => {
    // Show session setup modal if no session name is provided
    if (!sessionName.trim()) {
      setShowSessionSetup(true);
      return;
    }

    try {
      // Reset the initialization flag when starting a new timer
      initializing.current = false;
      
      // Clear any existing intervals first to be safe
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
      
      setDebugMessage('Creating session...');
      console.log('Creating session with backend...', { sessionName, sessionType, selectedLabels });
      
      // Create session with backend
      const sessionData = {
        name: sessionName.trim(),
        session_type: sessionType,
        planned_duration: (hours * 60) + minutes + Math.floor(seconds / 60), // Convert to minutes
        labels: selectedLabels,
        goals: tasks.filter(task => !task.completed).map(task => task.title), // Incomplete tasks as goals
        notes: `Session started from mobile app. Planned duration: ${formatTime(timeRemaining)}`
      };

      const success = await startSession(sessionData);
      
      if (success) {
        setDebugMessage('Session created successfully');
        console.log('Backend session created, starting timer...');
        
        // If demo mode is active, immediately update metrics to match demo values
        if (demoMode) {
          console.log('Timer started in demo mode - applying demo values');
          setMetrics({
            focus: demoFocusValue,
            stress: demoStressValue
          });
          // Start with demo values in history
          setFocusHistory([demoFocusValue]);
          setStressHistory([demoStressValue]);
        } else {
          // Regular session - start with initial metrics
          console.log('Timer started in regular mode - initializing metrics history');
          // Set initial random metrics for regular session
          const initialFocus = 1.2 + (Math.random() * 0.6);
          const initialStress = 1.5 + (Math.random() * 0.5);
          setMetrics({
            focus: initialFocus,
            stress: initialStress
          });
          // Start with initial values in history
          setFocusHistory([initialFocus]);
          setStressHistory([initialStress]);
        }
        
        setIsRunning(true);
        setHasStarted(true);
        if (demoMode) {
          timerStarted && timerStarted();
        }
      } else {
        Alert.alert('Error', sessionError || 'Failed to start session. Please try again.');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session. Please check your connection and try again.');
    }
  }, [sessionName, sessionType, selectedLabels, hours, minutes, seconds, timeRemaining, tasks, startSession, sessionError, demoMode, demoFocusValue, demoStressValue, timerStarted]);

  const handleResetTimer = useCallback(async () => {
    try {
      // Reset the initialization flag when resetting the timer
      initializing.current = false;
      
      // Clear any existing intervals
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }

      // End current session if active
      if (isSessionActive && currentSession) {
        console.log('Ending session due to reset...');
        await endSession();
      }
      
      setIsRunning(false);
      setHasStarted(false);
      setTimeRemaining(15); // Reset to 15 seconds for testing
      progress.setValue(0);
      
      // Reset session tracking data
      setDistractionCount(0);
      setSessionStartTime(null);
      setSessionDuration(0);
      setFocusHistory([]); // Empty initial array instead of sample data
      setStressHistory([]); // Empty initial array instead of sample data
      
      // Reset session configuration
      setSessionName('');
      setSelectedLabels([]);
      setSessionType('focus');
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }, [progress, isSessionActive, currentSession, endSession]);

  // Memoized computed values
  const totalDuration = useMemo(() => 
    (hours * 3600) + (minutes * 60) + seconds, 
    [hours, minutes, seconds]
  );

  // Tasks Tab Actions
  const addTask = async () => {
    if (newTaskTitle.trim()) {
      try {
        const taskData: CreateTaskRequest = {
          title: newTaskTitle.trim(),
          priority: 'medium',
          category: 'work',
          session_id: currentSession?.id
        };
        
        const newTask = await createTask(taskData);
        if (newTask) {
          setNewTaskTitle('');
        } else {
          Alert.alert('Error', 'Failed to create task. Please try again.');
        }
      } catch (error) {
        console.error('Error creating task:', error);
        Alert.alert('Error', 'Failed to create task. Please check your connection and try again.');
      }
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const success = await toggleTaskCompletion(taskId);
      if (!success) {
        Alert.alert('Error', 'Failed to update task. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task. Please check your connection and try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      Alert.alert(
        'Delete Task',
        'Are you sure you want to delete this task?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const success = await removeTask(taskId);
              if (!success) {
                Alert.alert('Error', 'Failed to delete task. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task. Please check your connection and try again.');
    }
  };

  // Add a function to record distractions
  const recordDistraction = useCallback(() => {
    if (isRunning) {
      setDistractionCount(prev => prev + 1);
    }
  }, [isRunning]);

  // Render Tab Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'timer':
        return (
          <ScrollView 
            style={styles.tabContentContainer}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={styles.setupContainer}>
              {/* Always show the progress circle */}
              <View style={styles.progressRingContainer}>
                <Svg height={CIRCLE_SIZE} width={CIRCLE_SIZE} style={styles.progressRing}>
                  <Defs>
                    <SvgLinearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#4D7BFF" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#7BA6FF" stopOpacity="1" />
                    </SvgLinearGradient>
                  </Defs>
                  
                  {/* Background Circle */}
                  <Circle 
                    cx={RADIUS}
                    cy={RADIUS}
                    r={RADIUS - (STROKE_WIDTH / 2) - 5}
                    stroke={darkTheme.background.secondary}
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    opacity={0.5}
                  />
                  
                  {/* Progress Circle - only visible when timer has started */}
                  <AnimatedCircle
                    cx={RADIUS}
                    cy={RADIUS}
                    r={RADIUS - (STROKE_WIDTH / 2) - 5}
                    stroke="url(#circleGradient)"
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={hasStarted ? progressStrokeDashoffset : CIRCLE_CIRCUMFERENCE}
                    fill="transparent"
                    rotation="-90"
                    origin={`${RADIUS}, ${RADIUS}`}
                  />
                </Svg>

                <View style={styles.timerDisplay}>
                  <Animated.Text style={[
                    styles.timerText,
                    { transform: [{ scale: pulseAnim }] }
                  ]}>
                    {formatTime(timeRemaining)}
                  </Animated.Text>
                  <Text style={styles.timerLabel}>
                    {hasStarted ? "Remaining" : "Duration"}
                  </Text>
                </View>
              </View>
              
              {/* Time Picker - only show when session hasn't started */}
              {!hasStarted && (
                <View style={styles.timePickerContainer}>
                  <NumberPicker 
                    value={hours} 
                    onValueChange={setHours} 
                    options={hourOptions}
                    label="HRS"
                    disabled={hasStarted}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <NumberPicker 
                    value={minutes} 
                    onValueChange={setMinutes} 
                    options={minuteOptions}
                    label="MIN"
                    disabled={hasStarted}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <NumberPicker 
                    value={seconds} 
                    onValueChange={setSeconds} 
                    options={secondOptions}
                    label="SEC"
                    disabled={hasStarted}
                  />
                </View>
              )}
              
              {/* Timer Controls - using the renderTimerControls function */}
              {renderTimerControls()}

              {/* Real-Time Metrics - only show when timer has started */}
              {hasStarted && (
                <View style={styles.metricsContainer}>
                  <Text style={styles.metricsTitle}>Current Metrics</Text>
                  <SpeedometerMetrics 
                    focusValue={metrics.focus} 
                    stressValue={metrics.stress}
                    containerStyle={{ 
                      // Ensure the container background matches the card background
                      backgroundColor: colors.background.card,
                      // Use consistent border styling with the HomeScreen
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    }} 
                  />

                  {/* Show distraction counter */}
                  {distractionCount > 0 && (
                    <View style={styles.distractionCountContainer}>
                      <MaterialCommunityIcons name="bell-off-outline" size={20} color="#FF9800" />
                      <Text style={styles.distractionCountText}>
                        Distractions: {distractionCount}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        );
      
      case 'tasks':
        return (
          <View style={styles.tabContentContainer}>
            {/* Task Statistics Header */}
            {tasks.length > 0 && (
              <View style={styles.taskStatsContainer}>
                <View style={styles.taskStatItem}>
                  <Text style={styles.taskStatValue}>{taskStats.total}</Text>
                  <Text style={styles.taskStatLabel}>Total</Text>
                </View>
                <View style={styles.taskStatItem}>
                  <Text style={styles.taskStatValue}>{taskStats.completed}</Text>
                  <Text style={styles.taskStatLabel}>Done</Text>
                </View>
                <View style={styles.taskStatItem}>
                  <Text style={styles.taskStatValue}>{taskStats.pending}</Text>
                  <Text style={styles.taskStatLabel}>Pending</Text>
                </View>
                <View style={styles.taskStatItem}>
                  <Text style={styles.taskStatValue}>{taskStats.completionRate}%</Text>
                  <Text style={styles.taskStatLabel}>Complete</Text>
                </View>
              </View>
            )}

            {/* Error Display */}
            {tasksError && !tasksError.includes('Method Not Allowed') && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#FF6B6B" />
                <Text style={styles.errorText}>{tasksError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshTasks}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Task Input */}
            <View style={styles.taskInputContainer}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add a task for this session..."
                placeholderTextColor={darkTheme.text.secondary}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                returnKeyType="done"
                onSubmitEditing={addTask}
                editable={!tasksLoading}
              />
              <TouchableOpacity 
                style={[styles.addTaskButton, tasksLoading && styles.addTaskButtonDisabled]} 
                onPress={addTask} 
                disabled={!newTaskTitle.trim() || tasksLoading}
              >
                {tasksLoading ? (
                  <ActivityIndicator size="small" color={darkTheme.text.secondary} />
                ) : (
                  <MaterialCommunityIcons 
                    name="plus" 
                    size={24} 
                    color={newTaskTitle.trim() ? darkTheme.text.primary : darkTheme.text.secondary} 
                  />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Task List */}
            {tasksLoading && tasks.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={darkTheme.primary.main} />
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons 
                  name="clipboard-text-outline" 
                  size={60} 
                  color={darkTheme.text.secondary} 
                />
                <Text style={styles.emptyStateText}>No tasks added yet</Text>
                <Text style={styles.emptyStateSubtext}>Add tasks to keep track of your work</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.taskList}
                refreshControl={
                  <RefreshControl
                    refreshing={tasksLoading}
                    onRefresh={refreshTasks}
                    tintColor={darkTheme.primary.main}
                  />
                }
              >
                {tasks.map(task => (
                  <View key={task.id} style={[
                    styles.taskItem,
                    task.completed && styles.taskItemCompleted
                  ]}>
                    <TouchableOpacity
                      style={styles.taskCheckbox}
                      onPress={() => toggleTask(task.id)}
                    >
                      <MaterialCommunityIcons
                        name={task.completed ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                        size={24}
                        color={task.completed ? darkTheme.primary.main : darkTheme.text.secondary}
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.taskContent}>
                      <Text style={[
                        styles.taskTitle,
                        task.completed && styles.taskTitleCompleted
                      ]}>
                        {task.title}
                      </Text>
                      
                      {/* Task metadata */}
                      <View style={styles.taskMetadata}>
                        {task.priority && (
                          <View style={[
                            styles.taskPriorityBadge,
                            { backgroundColor: tasksService.getTaskPriorityColor(task.priority) }
                          ]}>
                            <MaterialCommunityIcons
                              name={tasksService.getTaskPriorityIcon(task.priority) as any}
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.taskPriorityText}>{task.priority}</Text>
                          </View>
                        )}
                        
                        {task.category && (
                          <View style={[
                            styles.taskCategoryBadge,
                            { backgroundColor: tasksService.getTaskCategoryColor(task.category) }
                          ]}>
                            <MaterialCommunityIcons
                              name={tasksService.getTaskCategoryIcon(task.category) as any}
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.taskCategoryText}>{task.category}</Text>
                          </View>
                        )}
                        
                        {task.estimated_duration && (
                          <Text style={styles.taskDuration}>
                            ~{tasksService.formatTaskDuration(task.estimated_duration)}
                          </Text>
                        )}
                      </View>
                      
                      {task.description && (
                        <Text style={styles.taskDescription} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                    </View>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color={darkTheme.text.secondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );
      
      case 'history':
        return <DeepWorkHistory />;
      
      default:
        return null;
    }
  };

  useEffect(() => {
    // Only run intervals when this screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      // Start interval
      const interval = setInterval(() => {
        // Update logic
      }, 5000);
      
      return () => clearInterval(interval);
    });
    
    return unsubscribe;
  }, [navigation]);

  // Add distraction button to timer controls when running
  const renderTimerControls = () => {
    if (hasStarted) {
      return (
        <View style={styles.timerControls}>
          <TouchableOpacity 
            style={[styles.timerButton, isRunning && styles.pauseButton]}
            onPress={() => {
              if (isRunning) {
                pauseSession();
                setIsRunning(false);
              } else {
                resumeSession();
                setIsRunning(true);
              }
            }}
            disabled={sessionLoading}
          >
            <MaterialCommunityIcons 
              name={isRunning ? "pause" : "play"} 
              size={24} 
              color={darkTheme.text.primary} 
            />
            <Text style={styles.timerButtonText}>
              {isRunning ? "Pause" : "Resume"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.timerButton}
            onPress={handleResetTimer}
            disabled={sessionLoading}
          >
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={darkTheme.text.primary} 
            />
            <Text style={styles.timerButtonText}>Reset</Text>
          </TouchableOpacity>
          
          {isRunning && (
            <TouchableOpacity 
              style={[styles.timerButton, styles.distractionButton]}
              onPress={recordDistraction}
            >
              <MaterialCommunityIcons 
                name="bell-off-outline" 
                size={22} 
                color={darkTheme.text.primary} 
              />
              <Text style={styles.timerButtonText}>
                Distract
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    } else {
      return (
        <TouchableOpacity 
          style={[styles.startButton, sessionLoading && styles.startButtonDisabled]}
          onPress={handleStartTimer}
          disabled={sessionLoading}
        >
          <Text style={styles.startButtonText}>
            {sessionLoading ? 'Creating Session...' : 'Start Session'}
          </Text>
        </TouchableOpacity>
      );
    }
  };

  // Session Setup Modal Component
  const renderSessionSetupModal = () => (
    <Modal
      visible={showSessionSetup}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSessionSetup(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sessionSetupModal}>
          <View style={styles.sessionSetupHeader}>
            <Text style={styles.sessionSetupTitle}>Session Setup</Text>
            <TouchableOpacity onPress={() => setShowSessionSetup(false)}>
              <MaterialCommunityIcons name="close" size={24} color={darkTheme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Session Name Input */}
          <View style={styles.sessionInputContainer}>
            <Text style={styles.sessionInputLabel}>Session Name</Text>
            <TextInput
              style={styles.sessionInput}
              placeholder="Enter session name..."
              placeholderTextColor={darkTheme.text.secondary}
              value={sessionName}
              onChangeText={setSessionName}
              returnKeyType="next"
            />
          </View>

          {/* Session Type Picker */}
          <View style={styles.sessionInputContainer}>
            <Text style={styles.sessionInputLabel}>Session Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionTypeContainer}>
              {(['focus', 'meditation', 'study', 'break', 'custom'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.sessionTypeButton,
                    sessionType === type && styles.sessionTypeButtonActive
                  ]}
                  onPress={() => setSessionType(type)}
                >
                  <MaterialCommunityIcons
                    name={sessionService.getSessionTypeIcon(type) as any}
                    size={20}
                    color={sessionType === type ? '#FFFFFF' : darkTheme.text.secondary}
                  />
                  <Text style={[
                    styles.sessionTypeText,
                    sessionType === type && styles.sessionTypeTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Session Labels */}
          <View style={styles.sessionInputContainer}>
            <Text style={styles.sessionInputLabel}>Labels (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionLabelsContainer}>
              {availableLabels.slice(0, 6).map((label) => {
                const labelId = typeof label.id === 'string' ? label.id : label.id.toString();
                const isSelected = selectedLabels.includes(labelId);
                
                return (
                  <TouchableOpacity
                    key={labelId}
                    style={[
                      styles.sessionLabelButton,
                      isSelected && styles.sessionLabelButtonActive,
                      { borderColor: label.color || darkTheme.primary.main }
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedLabels(selectedLabels.filter(id => id !== labelId));
                      } else {
                        setSelectedLabels([...selectedLabels, labelId]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.sessionLabelText,
                      isSelected && styles.sessionLabelTextActive
                    ]}>
                      {label.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.sessionSetupActions}>
            <TouchableOpacity 
              style={styles.sessionCancelButton}
              onPress={() => setShowSessionSetup(false)}
            >
              <Text style={styles.sessionCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sessionStartButton, !sessionName.trim() && styles.sessionStartButtonDisabled]}
              onPress={() => {
                setShowSessionSetup(false);
                // Delay the start to allow modal to close
                setTimeout(handleStartTimer, 100);
              }}
              disabled={!sessionName.trim()}
            >
              <Text style={styles.sessionStartButtonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.mainContainer}>
      {/* Header - simplified without back button */}
      <View style={styles.header}>
        <Text style={styles.title}>Deep Work Session</Text>
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.customTabBar}>
        <TouchableOpacity 
          style={[styles.customTab, activeTab === 'timer' && styles.activeCustomTab]}
          onPress={() => setActiveTab('timer')}
        >
          <Text style={[styles.customTabText, activeTab === 'timer' && styles.activeCustomTabText]}>
            Timer
          </Text>
          {activeTab === 'timer' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.customTab, activeTab === 'tasks' && styles.activeCustomTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.customTabText, activeTab === 'tasks' && styles.activeCustomTabText]}>
            Tasks
          </Text>
          {activeTab === 'tasks' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.customTab, activeTab === 'history' && styles.activeCustomTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.customTabText, activeTab === 'history' && styles.activeCustomTabText]}>
            History
          </Text>
          {activeTab === 'history' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
        {renderSessionSetupModal()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: darkTheme.background.primary,
    paddingTop: 40, // Added significant top padding for status bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the title
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: darkTheme.text.primary,
  },
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: darkTheme.background.secondary,
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  customTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeCustomTab: {
    backgroundColor: 'transparent', 
  },
  customTabText: {
    color: darkTheme.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeCustomTabText: {
    color: darkTheme.text.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '40%',
    backgroundColor: darkTheme.primary.main,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  contentContainer: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: darkTheme.background.primary,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  scrollContentContainer: {
    paddingBottom: 120, // Add significant bottom padding for scrolling
  },
  setupContainer: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 40, // Add padding at the bottom of the setup container
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  progressRing: {
    // No transform needed as we're using the rotation prop
  },
  timerDisplay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkTheme.background.primary,
    borderRadius: 100,
    width: RADIUS * 1.2,
    height: RADIUS * 1.2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    color: darkTheme.text.primary,
    letterSpacing: 1,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: darkTheme.text.secondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pickerWrapper: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pickerLabel: {
    fontSize: 12,
    color: darkTheme.text.secondary,
    marginBottom: 4,
  },
  pickerButton: {
    backgroundColor: darkTheme.background.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  pickerButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: darkTheme.text.primary,
  },
  pickerButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: darkTheme.primary.main,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  startButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  startButtonText: {
    color: darkTheme.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '95%',
    marginBottom: 24,
  },
  timerButton: {
    backgroundColor: darkTheme.background.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 90,
  },
  pauseButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
  },
  timerButtonText: {
    color: darkTheme.text.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: darkTheme.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalOptionText: {
    fontSize: 18,
    color: darkTheme.text.secondary,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: darkTheme.primary.main,
    fontWeight: '600',
  },
  metricsContainer: {
    width: '100%',
    marginBottom: 120, // Increased from 80 to 120
    marginTop: 10,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'left',
    paddingLeft: 24,
  },
  // Task Tab Styles
  taskInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 16,
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    marginHorizontal: 0,
  },
  taskInput: {
    flex: 1,
    color: darkTheme.text.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addTaskButton: {
    padding: 12,
    backgroundColor: darkTheme.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
  taskCheckbox: {
    marginRight: 12,
  },
  taskTitle: {
    flex: 1,
    color: darkTheme.text.primary,
    fontSize: 16,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: darkTheme.text.secondary,
  },
  deleteButton: {
    padding: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: darkTheme.text.primary,
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: darkTheme.text.secondary,
    marginTop: 8,
  },
  distractionButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  distractionCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
  },
  distractionCountText: {
    marginLeft: 8,
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
  },
  sessionSetupModal: {
    backgroundColor: darkTheme.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
  },
  sessionSetupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionSetupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkTheme.text.primary,
  },
  sessionInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sessionInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginBottom: 8,
  },
  sessionInput: {
    backgroundColor: darkTheme.background.card,
    borderRadius: 8,
    padding: 12,
    color: darkTheme.text.primary,
    fontSize: 16,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
  },
  sessionTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: darkTheme.text.secondary,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: darkTheme.background.card,
  },
  sessionTypeButtonActive: {
    borderColor: darkTheme.primary.main,
    backgroundColor: darkTheme.primary.main,
  },
  sessionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.text.secondary,
    marginLeft: 6,
  },
  sessionTypeTextActive: {
    color: '#FFFFFF',
  },
  sessionLabelsContainer: {
    flexDirection: 'row',
  },
  sessionLabelButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: darkTheme.text.secondary,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: darkTheme.background.card,
  },
  sessionLabelButtonActive: {
    backgroundColor: darkTheme.primary.main,
  },
  sessionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.text.secondary,
  },
  sessionLabelTextActive: {
    color: '#FFFFFF',
  },
  sessionSetupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  sessionCancelButton: {
    flex: 1,
    backgroundColor: darkTheme.background.card,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sessionCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.text.secondary,
  },
  sessionStartButton: {
    flex: 1,
    backgroundColor: darkTheme.primary.main,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sessionStartButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sessionStartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taskStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 8,
    marginBottom: 16,
  },
  taskStatItem: {
    alignItems: 'center',
  },
  taskStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginBottom: 4,
  },
  taskStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: darkTheme.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: darkTheme.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    padding: 12,
    backgroundColor: darkTheme.primary.main,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: darkTheme.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  taskContent: {
    flex: 1,
  },
  taskMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskPriorityBadge: {
    padding: 4,
    borderWidth: 1,
    borderColor: darkTheme.text.secondary,
    borderRadius: 8,
    marginRight: 8,
  },
  taskPriorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.text.primary,
  },
  taskCategoryBadge: {
    padding: 4,
    borderWidth: 1,
    borderColor: darkTheme.text.secondary,
    borderRadius: 8,
    marginRight: 8,
  },
  taskCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.text.primary,
  },
  taskDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: darkTheme.text.secondary,
  },
  taskDescription: {
    fontSize: 14,
    color: darkTheme.text.primary,
  },
  addTaskButtonDisabled: {
    opacity: 0.5,
  },
  taskItemCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
});

export default DeepWorkScreen; 