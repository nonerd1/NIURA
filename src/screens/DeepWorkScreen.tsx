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
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
// Add session service imports
import { useSession } from '../hooks/useSession';
import { sessionService, SessionLabel } from '../services/sessionService';
import { useTasks } from '../hooks/useTasks';
import { tasksService, CreateTaskRequest, Task } from '../services/tasksService';

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
  const { colors, getScaledFontSize, isDarkMode } = useTheme();

  const pickerStyles = StyleSheet.create({
    pickerWrapper: {
      alignItems: 'center',
      marginHorizontal: 4,
    },
    pickerLabel: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      marginBottom: 4,
    },
    pickerButton: {
      backgroundColor: colors.background.card,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      minWidth: 60,
      alignItems: 'center',
    },
    pickerButtonDisabled: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    },
    pickerButtonText: {
      fontSize: getScaledFontSize(24),
      fontWeight: '600',
      color: colors.text.primary,
    },
    pickerButtonTextDisabled: {
      color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.background.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    modalOption: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalOptionText: {
      fontSize: getScaledFontSize(16),
      color: colors.text.primary,
      textAlign: 'center',
    },
    modalOptionTextSelected: {
      color: colors.primary.main,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={pickerStyles.pickerWrapper}>
      <Text style={pickerStyles.pickerLabel}>{label}</Text>
      <TouchableOpacity 
        style={[pickerStyles.pickerButton, disabled && pickerStyles.pickerButtonDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={[pickerStyles.pickerButtonText, disabled && pickerStyles.pickerButtonTextDisabled]}>
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
          style={pickerStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={pickerStyles.modalContent}>
            <ScrollView>
              {options.map((option: PickerOption) => (
                <TouchableOpacity
                  key={option.value}
                  style={pickerStyles.modalOption}
                  onPress={() => {
                    onValueChange(parseInt(option.value, 10));
                    setIsVisible(false);
                  }}
                >
                  <Text style={[
                    pickerStyles.modalOptionText,
                    value === parseInt(option.value, 10) && pickerStyles.modalOptionTextSelected
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
  const { colors, getScaledFontSize, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'history'>('timer');
  
  // Move styles inside component to access dynamic theme colors
  const styles = StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: colors.background.dark,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.dark,
    },
    title: {
      fontSize: getScaledFontSize(20),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    customTabBar: {
      flexDirection: 'row',
      backgroundColor: colors.background.card,
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
      color: colors.text.secondary,
      fontSize: getScaledFontSize(14),
      fontWeight: '600',
    },
    activeCustomTabText: {
      color: colors.text.primary,
    },
    activeIndicator: {
      position: 'absolute',
      bottom: 0,
      height: 3,
      width: '40%',
      backgroundColor: colors.primary.main,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
    },
    contentContainer: {
      flex: 1,
    },
    tabContentContainer: {
      flex: 1,
      backgroundColor: colors.background.dark,
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    scrollContentContainer: {
      paddingBottom: 40,
    },
    setupContainer: {
      alignItems: 'center',
      paddingTop: 0,
      paddingBottom: 40,
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
      backgroundColor: colors.background.dark,
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
      fontSize: getScaledFontSize(36),
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: 1,
    },
    timerLabel: {
      fontSize: getScaledFontSize(14),
      fontWeight: '500',
      color: colors.text.secondary,
      marginTop: 4,
      letterSpacing: 0.5,
    },
    timePickerContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginBottom: 40,
    },
    timeSeparator: {
      fontSize: getScaledFontSize(24),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 10,
      marginHorizontal: 4,
    },
    startButton: {
      backgroundColor: colors.primary.main,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      width: '80%',
    },
    startButtonDisabled: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    },
    startButtonText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
    },
    timerControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '95%',
      marginBottom: 24,
    },
    timerButton: {
      backgroundColor: colors.background.card,
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
      color: colors.text.primary,
      fontSize: getScaledFontSize(14),
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
      backgroundColor: colors.background.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    modalOption: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalOptionText: {
      fontSize: getScaledFontSize(16),
      color: colors.text.primary,
      textAlign: 'center',
    },
    modalOptionTextSelected: {
      color: colors.primary.main,
      fontWeight: 'bold',
    },
    // Continue with additional styles...
    taskStatsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.background.card,
      borderRadius: 8,
      marginBottom: 16,
      marginTop: 8,
    },
    taskStatItem: {
      alignItems: 'center',
    },
    taskStatValue: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    taskStatLabel: {
      fontSize: getScaledFontSize(14),
      fontWeight: '500',
      color: colors.text.secondary,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.background.card,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      fontWeight: '500',
    },
    retryButton: {
      padding: 12,
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      alignItems: 'center',
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      fontWeight: '500',
      marginTop: 16,
    },
    taskContent: {
      flex: 1,
    },
    taskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    taskMetadata: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    taskPriorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      marginRight: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    taskPriorityText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 4,
      textTransform: 'capitalize',
    },
    taskCategoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      marginRight: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    taskCategoryText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 4,
      textTransform: 'capitalize',
    },
    taskDuration: {
      fontSize: getScaledFontSize(12),
      fontWeight: '500',
      color: colors.text.secondary,
    },
    taskDescription: {
      fontSize: getScaledFontSize(14),
      color: colors.text.primary,
      marginTop: 4,
    },
    addTaskButtonDisabled: {
      opacity: 0.5,
    },
    taskItemCompleted: {
      opacity: 0.7,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    metricsContainer: {
      backgroundColor: colors.background.card,
      borderRadius: 12,
      padding: 16,
      marginVertical: 10,
    },
    metricsTitle: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
      textAlign: 'center',
    },
    distractionCountContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    distractionCountText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600',
      color: colors.text.primary,
      marginTop: 8,
    },
    taskInputContainer: {
      flexDirection: 'row',
      marginVertical: 16,
      alignItems: 'center',
    },
    taskInput: {
      flex: 1,
      backgroundColor: colors.background.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 8,
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
    },
    addTaskButton: {
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTaskButtonText: {
      color: '#FFFFFF',
      fontSize: getScaledFontSize(14),
      fontWeight: '600',
    },
    taskItem: {
      backgroundColor: colors.background.card,
      borderRadius: 8,
      padding: 12,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    taskCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.text.secondary,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskCheckboxChecked: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    taskText: {
      flex: 1,
      fontSize: getScaledFontSize(16),
      color: colors.text.primary,
    },
    taskTextCompleted: {
      textDecorationLine: 'line-through',
      color: colors.text.secondary,
    },
    deleteTaskButton: {
      padding: 8,
    },
    historyContainer: {
      padding: 16,
    },
    historyTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 16,
    },
    sessionSetupModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sessionSetupContent: {
      backgroundColor: colors.background.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 20,
      maxHeight: '80%',
    },
    sessionSetupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    sessionSetupTitle: {
      fontSize: getScaledFontSize(20),
      fontWeight: '600',
      color: colors.text.primary,
    },
    sessionSetupCloseButton: {
      padding: 8,
    },
    sessionNameInput: {
      backgroundColor: colors.background.dark,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
    },
    sessionTypeContainer: {
      marginBottom: 16,
    },
    sessionTypeLabel: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    sessionTypeOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    sessionTypeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderWidth: 1,
      borderColor: colors.text.secondary,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.background.dark,
    },
    sessionTypeButtonActive: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    sessionTypeText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '600',
      color: colors.text.secondary,
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
      borderColor: colors.text.secondary,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: colors.background.card,
    },
    sessionLabelButtonActive: {
      backgroundColor: colors.primary.main,
    },
    sessionLabelText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '600',
      color: colors.text.secondary,
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
      backgroundColor: colors.background.card,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    sessionCancelButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.secondary,
    },
    sessionStartButton: {
      flex: 1,
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    sessionStartButtonDisabled: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    },
    sessionStartButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // Add remaining missing styles
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: getScaledFontSize(18),
      color: colors.text.primary,
      marginTop: 16,
      fontWeight: '600',
    },
    emptyStateSubtext: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginTop: 8,
    },
    taskList: {
      flex: 1,
    },
    taskListContent: {
      paddingBottom: 20,
    },
    distractionButton: {
      backgroundColor: 'rgba(255, 152, 0, 0.2)',
    },
    sessionNameInputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    sessionNameLabel: {
      fontSize: getScaledFontSize(14),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    sessionLabelsOptions: {
      flexDirection: 'row',
    },
  });
  
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

  // Modify the timer effect to only update metrics when NOT in demo mode
  useEffect(() => {
    // Only set up timer when starting
    if (isRunning && !timerIntervalRef.current) {
      // Mark as initializing to prevent duplicate timer setup
      initializing.current = true;
      
      // If this is the first time running, set the session start time
      if (sessionStartTime === null) {
        setSessionStartTime(Date.now());
        setSessionDuration(0);
        // Set initial metrics at start - use demo values if in demo mode
        if (demoMode) {
          setMetrics({
            focus: demoFocusValue,
            stress: demoStressValue
          });
          setFocusHistory([demoFocusValue]);
          setStressHistory([demoStressValue]);
        } else {
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
            
            // Navigate to summary screen with simple fallback data
            // We'll use a timeout to ensure state updates are complete
            setTimeout(() => {
              const configuredDuration = (hours * 3600) + (minutes * 60) + seconds;
              
              navigation.navigate('SessionSummary', {
                duration: configuredDuration,
                focusData: [1.2, 1.4, 1.6, 1.8, 2.0], // Simple fallback data
                stressData: [1.5, 1.3, 1.4, 1.2, 1.0], // Simple fallback data
                distractionCount: 0, // Will be updated by component state later
                completedTasks: 0, // Will be updated by component state later
                totalTasks: 0, // Will be updated by component state later
                sessionName: 'Deep Work Session',
                sessionType: 'focus'
              });
            }, 100);
            
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
      
      // Setup metrics interval separately - handle both demo and regular mode
      if (!metricsIntervalRef.current) {
        metricsIntervalRef.current = setInterval(() => {
          if (demoMode) {
            // In demo mode, update with demo values (but only if they've changed)
            setMetrics(prevMetrics => {
              if (prevMetrics.focus !== demoFocusValue || prevMetrics.stress !== demoStressValue) {
                // Add new demo values to history only if they're different
                setFocusHistory(prev => {
                  if (prev.length === 0 || prev[prev.length - 1] !== demoFocusValue) {
                    return [...prev, demoFocusValue];
                  }
                  return prev;
                });
                setStressHistory(prev => {
                  if (prev.length === 0 || prev[prev.length - 1] !== demoStressValue) {
                    return [...prev, demoStressValue];
                  }
                  return prev;
                });
                
                // Add EEG reading directly here to avoid useEffect loops
                if (isSessionActive && currentSession) {
                  addEEGReading(demoFocusValue, demoStressValue);
                }
                
                return {
                  focus: demoFocusValue,
                  stress: demoStressValue
                };
              }
              return prevMetrics; // No change needed
            });
          } else {
            // Regular mode - update with random changes
            setMetrics(prevMetrics => {
              const newFocusValue = Math.max(0.5, Math.min(2.8, prevMetrics.focus + (Math.random() * 0.2 - 0.1)));
              const newStressValue = Math.max(0.5, Math.min(2.8, prevMetrics.stress + (Math.random() * 0.2 - 0.1)));
              
              // Add new values to history
              setFocusHistory(prev => [...prev, newFocusValue]);
              setStressHistory(prev => [...prev, newStressValue]);
              
              // Add EEG reading directly here to avoid useEffect loops
              if (isSessionActive && currentSession) {
                addEEGReading(newFocusValue, newStressValue);
              }
              
              return {
                focus: newFocusValue,
                stress: newStressValue
              };
            });
          }
        }, 3000); // Update every 3 seconds
      }
    } else if (!isRunning) {
      // Reset initialization state when timer stops/pauses
      initializing.current = false;
      
      // Clear timer when stopped
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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
    };
  // Only depend on isRunning to prevent infinite loops
  }, [isRunning]);

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
    // Always show session setup modal if no session name is provided
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
        date: new Date().toISOString(),
        duration: Math.ceil(((hours * 3600) + (minutes * 60) + seconds) / 60), // Convert total seconds to minutes, round up
        label: `${sessionName.trim()} [${sessionType}]`, // Include session type in label for backend storage
        session_type: sessionType // Pass session type for frontend tracking
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
  }, [sessionName, sessionType, selectedLabels, hours, minutes, seconds, startSession, sessionError, demoMode, demoFocusValue, demoStressValue, timerStarted]);

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
      // Find the task object from our current tasks array
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        Alert.alert('Error', 'Task not found.');
        return;
      }
      
      const success = await toggleTaskCompletion(taskId, !task.completed, task);
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
                    stroke={colors.background.card}
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
                placeholderTextColor={colors.text.secondary}
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
                  <ActivityIndicator size="small" color={colors.text.secondary} />
                ) : (
                  <Text style={styles.addTaskButtonText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Task List */}
            {tasksLoading && tasks.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons 
                  name="clipboard-text-outline" 
                  size={60} 
                  color={colors.text.secondary} 
                />
                <Text style={styles.emptyStateText}>No tasks added yet</Text>
                <Text style={styles.emptyStateSubtext}>Add tasks to keep track of your work</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.taskList}
                contentContainerStyle={styles.taskListContent}
                refreshControl={
                  <RefreshControl
                    refreshing={tasksLoading}
                    onRefresh={refreshTasks}
                    tintColor={colors.primary.main}
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
                        color={task.completed ? colors.primary.main : colors.text.secondary}
                      />
                    </TouchableOpacity>
                    
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <Text style={[
                          styles.taskText,
                          task.completed && styles.taskTextCompleted
                        ]}>
                          {task.title}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteTaskButton}
                          onPress={() => deleteTask(task.id)}
                        >
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color={colors.text.secondary}
                          />
                        </TouchableOpacity>
                      </View>
                      
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
                      
                      {task.description && task.description.trim() && task.description !== task.title && (
                        <Text style={styles.taskDescription} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                    </View>
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
              color={colors.text.primary} 
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
              color={colors.text.primary} 
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
                color={colors.text.primary} 
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
      <View style={styles.sessionSetupModal}>
        <View style={styles.sessionSetupContent}>
          <View style={styles.sessionSetupHeader}>
            <Text style={styles.sessionSetupTitle}>Session Setup</Text>
            <TouchableOpacity onPress={() => setShowSessionSetup(false)}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Session Name Input */}
          <View style={styles.sessionNameInputContainer}>
            <Text style={styles.sessionNameLabel}>Session Name</Text>
            <TextInput
              style={styles.sessionNameInput}
              placeholder="Enter session name..."
              placeholderTextColor={colors.text.secondary}
              value={sessionName}
              onChangeText={setSessionName}
              returnKeyType="next"
            />
          </View>

          {/* Session Type Picker */}
          <View style={styles.sessionTypeContainer}>
            <Text style={styles.sessionTypeLabel}>Session Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionTypeOptions}>
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
                    color={sessionType === type ? '#FFFFFF' : colors.text.secondary}
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
          <View style={styles.sessionLabelsContainer}>
            <Text style={styles.sessionLabelText}>Labels (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionLabelsOptions}>
              {availableLabels.slice(0, 6).map((label) => {
                const labelId = typeof label.id === 'string' ? label.id : label.id.toString();
                const isSelected = selectedLabels.includes(labelId);
                
                return (
                  <TouchableOpacity
                    key={labelId}
                    style={[
                      styles.sessionLabelButton,
                      isSelected && styles.sessionLabelButtonActive,
                      { borderColor: label.color || colors.primary.main }
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
    <SafeAreaView style={styles.mainContainer} edges={['top', 'bottom']}>
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
    </SafeAreaView>
  );
};

export default DeepWorkScreen; 