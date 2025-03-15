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

// Define Task type
type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
};

// Type for navigation
type NavigationProp = StackNavigationProp<RootStackParamList>;

// Main DeepWorkScreen Component
const DeepWorkScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'history'>('timer');
  
  // STATE FOR TIMER TAB
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(15); // Set to 15 seconds for easier testing
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15); // Set to 15 seconds
  const [progress] = useState(new Animated.Value(0));
  const [hasStarted, setHasStarted] = useState(false);
  
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

  // STATE FOR TASKS TAB
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

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
            setDebugMessage('Timer finished! Navigating to summary...');
            
            // Use the configured duration directly instead of calculating elapsed time
            const configuredDuration = (hours * 3600) + (minutes * 60) + seconds;
            setSessionDuration(configuredDuration);
            
            // Ensure we have at least some data points for the summary
            console.log(`Session complete. Data points collected - Focus: ${focusHistory.length}, Stress: ${stressHistory.length}`);
            
            // If we somehow have no data (which shouldn't happen), use fallback data
            const fallbackFocusData = [1.2, 1.4, 1.6, 1.8, 2.0];
            const fallbackStressData = [1.5, 1.3, 1.4, 1.2, 1.0];
            
            // Make sure we send at least 2 data points for a proper graph
            const finalFocusData = focusHistory.length >= 2 ? focusHistory : 
                                  (focusHistory.length === 1 ? [...focusHistory, focusHistory[0] + 0.2] : fallbackFocusData);
            
            const finalStressData = stressHistory.length >= 2 ? stressHistory : 
                                   (stressHistory.length === 1 ? [...stressHistory, stressHistory[0] - 0.1] : fallbackStressData);
            
            // Navigate directly to summary screen with the configured duration
            navigation.navigate('SessionSummary', {
              duration: configuredDuration,
              focusData: finalFocusData,
              stressData: finalStressData,
              distractionCount: distractionCount,
              completedTasks: tasks.filter(task => task.completed).length,
              totalTasks: tasks.length
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
  const handleStartTimer = useCallback(() => {
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
    
    setDebugMessage('Timer started');
    console.log('Timer started with time:', timeRemaining);
    
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
  }, [demoMode, demoFocusValue, demoStressValue, timerStarted, timeRemaining]);

  const handleResetTimer = useCallback(() => {
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
  }, [progress]);

  // Memoized computed values
  const totalDuration = useMemo(() => 
    (hours * 3600) + (minutes * 60) + seconds, 
    [hours, minutes, seconds]
  );

  // Tasks Tab Actions
  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        completed: false,
        createdAt: new Date()
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
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
            <View style={styles.taskInputContainer}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add a task for this session..."
                placeholderTextColor={darkTheme.text.secondary}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                returnKeyType="done"
                onSubmitEditing={addTask}
              />
              <TouchableOpacity 
                style={styles.addTaskButton} 
                onPress={addTask} 
                disabled={!newTaskTitle.trim()}
              >
                <MaterialCommunityIcons 
                  name="plus" 
                  size={24} 
                  color={newTaskTitle.trim() ? darkTheme.text.primary : darkTheme.text.secondary} 
                />
              </TouchableOpacity>
            </View>
            
            {tasks.length === 0 ? (
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
              <ScrollView style={styles.taskList}>
                {tasks.map(task => (
                  <View key={task.id} style={styles.taskItem}>
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
                    <Text style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted
                    ]}>
                      {task.title}
                    </Text>
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
            onPress={() => setIsRunning(!isRunning)}
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
          style={styles.startButton}
          onPress={handleStartTimer}
        >
          <Text style={styles.startButtonText}>Start Session</Text>
        </TouchableOpacity>
      );
    }
  };

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
});

export default DeepWorkScreen; 