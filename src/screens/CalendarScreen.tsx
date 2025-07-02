import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  TextInput,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated
} from 'react-native';
import { Calendar, CalendarProps, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useEvents } from '../hooks/useEvents';
import { eventsService, Event, CreateEventRequest, BackendEventCreate } from '../services/eventsService';
import { notificationService } from '../services/notificationService';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { sessionService } from '../services/sessionService';
import { useGoals } from '../hooks/useGoals';
import { Goal } from '../services/goalsService';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

interface FocusStressData {
  [date: string]: {
    focus: number;
    stress: number;
    marked?: boolean;
    dotColor?: string;
  };
}

// Goal tracking service - Updated for new Goal interface
class GoalTrackingService {
  static calculateGoalProgress(goal: Goal, sessions: any[]): number {
    if (!sessions || sessions.length === 0) return goal.current;
    
    const goalStartDate = goal.startDate ? new Date(goal.startDate) : new Date();
    const goalEndDate = goal.endDate ? new Date(goal.endDate) : new Date();
    
    // Filter sessions within goal date range
    const relevantSessions = sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= goalStartDate && sessionDate <= goalEndDate;
    });
    
    switch (goal.trackingType) {
      case 'sessions':
        // Count completed sessions of specific type
        if (goal.type === 'focus') {
          return relevantSessions.filter(s => s.session_type === 'focus').length;
        } else if (goal.type === 'stress') {
          return relevantSessions.filter(s => s.session_type === 'meditation').length;
        } else {
          return relevantSessions.length;
        }
        
      case 'minutes':
        // Sum duration of relevant sessions
        if (goal.type === 'focus') {
          return relevantSessions
            .filter(s => s.session_type === 'focus')
            .reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 0), 0);
        } else if (goal.type === 'stress') {
          return relevantSessions
            .filter(s => s.session_type === 'meditation')
            .reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 0), 0);
        } else {
          return relevantSessions
            .reduce((sum, s) => sum + (s.actual_duration || s.planned_duration || 0), 0);
        }
        
      case 'focus_score':
        // Count sessions with high focus (avg_focus > 2.0)
        return relevantSessions.filter(s => (s.avg_focus || 0) > 2.0).length;
        
      case 'stress_episodes':
        // Count days with low stress (avg_stress < 1.5)
        const lowStressDays = new Set();
        relevantSessions.forEach(s => {
          if ((s.avg_stress || 0) < 1.5) {
            const day = new Date(s.start_time).toDateString();
            lowStressDays.add(day);
          }
        });
        return lowStressDays.size;
        
      default:
        return goal.current;
    }
  }
  
  static getDefaultGoals(): Goal[] {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    return [
      {
        id: '1',
        name: 'Complete 10 focus sessions this month',
        target: 10,
        current: 0,
        unit: 'sessions',
        startDate: monthStart,
        endDate: monthEnd,
        type: 'focus',
        trackingType: 'sessions',
        targetMetric: 'focus_sessions'
      },
      {
        id: '2',
        name: 'Meditate for 60 minutes this month',
        target: 60,
        current: 0,
        unit: 'minutes',
        startDate: monthStart,
        endDate: monthEnd,
        type: 'stress',
        trackingType: 'minutes',
        targetMetric: 'meditation_minutes'
      },
      {
        id: '3',
        name: 'Achieve high focus in 5 sessions',
        target: 5,
        current: 0,
        unit: 'sessions',
        startDate: monthStart,
        endDate: monthEnd,
        type: 'focus',
        trackingType: 'focus_score',
        targetMetric: 'high_focus_sessions'
      }
    ];
  }
}

const CalendarScreen = () => {
  const { colors, getScaledFontSize, isDarkMode } = useTheme();
  
  const { 
    events, 
    todaysEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getEventsForDate,
    isLoading: eventsLoading, 
    error: eventsError 
  } = useEvents();
  
  const { sessions, isLoading: sessionsLoading, refresh: refreshSessions } = useSessionHistory();
  const { goals, addGoal, deleteGoal: removeGoal } = useGoals();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [eventModalVisible, setEventModalVisible] = useState<boolean>(false);
  const [goalModalVisible, setGoalModalVisible] = useState<boolean>(false);
  const [completedGoals, setCompletedGoals] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [newEvent, setNewEvent] = useState<Partial<CreateEventRequest>>({
    date: '',
    title: '',
    type: 'custom',
    time: '',
    duration: '',
    reminder: true
  });
  
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    target: 10,
    current: 0,
    unit: 'sessions',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    type: 'focus',
    trackingType: 'sessions'
  });
  
  const focusStressData: FocusStressData = {
    '2023-07-01': { focus: 2.1, stress: 1.3 },
    '2023-07-02': { focus: 2.3, stress: 1.2 },
    '2023-07-03': { focus: 2.5, stress: 1.0 },
    '2023-07-04': { focus: 2.2, stress: 1.5 },
    '2023-07-05': { focus: 1.8, stress: 1.8 },
    '2023-07-06': { focus: 1.6, stress: 2.0 },
    '2023-07-07': { focus: 1.9, stress: 1.7 },
    '2023-07-08': { focus: 2.0, stress: 1.6 },
    '2023-07-09': { focus: 2.2, stress: 1.4 },
    '2023-07-10': { focus: 2.4, stress: 1.2, marked: true, dotColor: '#4287f5' },
    '2023-07-11': { focus: 2.1, stress: 1.5 },
    '2023-07-12': { focus: 1.9, stress: 1.7, marked: true, dotColor: '#FFA500' },
    '2023-07-13': { focus: 1.7, stress: 1.9 },
    '2023-07-14': { focus: 1.5, stress: 2.1 },
    '2023-07-15': { focus: 1.8, stress: 1.8 }
  };

  const getMarkedDates = () => {
    const markedDates: any = {};
    const isLightMode = !isDarkMode;
    
    // First, add event markers
    events.forEach(event => {
      const eventDate = event.date;
      if (eventDate && !markedDates[eventDate]) {
        markedDates[eventDate] = { marked: true, dotColor: colors.primary.main };
      }
    });
    
    // Then, add focus/stress heat map colors
    Object.entries(focusStressData).forEach(([date, data]) => {
      const focusLevel = data.focus;
      const stressLevel = data.stress;
      const focusScore = Math.min(Math.max(focusLevel, 0), 5);
      const stressScore = Math.min(Math.max(stressLevel, 0), 5);
      const combinedScore = focusScore - stressScore;
      let backgroundColor = colors.background.card;
      let textColor = colors.text.primary;
      let isSpecialDay = false;
      // Create a heat map with 5 color levels
      if (combinedScore >= 2) {
        backgroundColor = '#27ae60'; // Bright green
        textColor = '#FFFFFF';
        isSpecialDay = true;
      } else if (combinedScore >= 1) {
        backgroundColor = '#2ecc71'; // Green
        textColor = '#FFFFFF';
        isSpecialDay = true;
      } else if (combinedScore >= -0.5) {
        backgroundColor = '#f39c12'; // Orange
        textColor = '#FFFFFF';
        isSpecialDay = true;
      } else if (combinedScore >= -1.5) {
        backgroundColor = '#e74c3c'; // Red
        textColor = '#FFFFFF';
        isSpecialDay = true;
      } else if (combinedScore < -1.5) {
        backgroundColor = '#c0392b'; // Dark red
        textColor = '#FFFFFF';
        isSpecialDay = true;
      }
      // For normal days, use theme background and text
      markedDates[date] = {
        ...markedDates[date],
        customStyles: {
          container: {
            backgroundColor,
            borderRadius: 16,
            width: 32,
            height: 32,
            justifyContent: 'center',
            alignItems: 'center',
          },
          text: {
            color: textColor,
            fontWeight: 'bold',
            fontSize: 16,
          }
        }
      };
      // Handle selected date
      if (date === selectedDate) {
        markedDates[date] = {
          ...markedDates[date],
          selected: true,
          selectedColor: 'transparent',
          customStyles: {
            ...markedDates[date]?.customStyles,
            container: {
              ...markedDates[date]?.customStyles?.container,
              borderWidth: 3,
              borderColor: colors.primary.main,
            },
            text: {
              ...markedDates[date]?.customStyles?.text,
              fontWeight: 'bold',
            }
          }
        };
      }
    });
    return markedDates;
  };
  
  const getSelectedDateData = () => {
    if (!selectedDate) return null;
    
    return {
      date: selectedDate,
      events: getEventsForDate(selectedDate),
      focusStress: focusStressData[selectedDate] || { focus: 0, stress: 0 }
    };
  };
  
  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };
  
  const handleAddEvent = async () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      try {
        // Convert duration to turnaround_time in minutes
        const durationInMinutes = eventsService.parseDuration(newEvent.duration || '30 min');
        
        // Create proper datetime by combining date and time
        const eventDate = newEvent.date || selectedDate;
        const eventTime = newEvent.time || '12:00';
        const combinedDateTime = new Date(`${eventDate}T${eventTime}:00`);
        
        // Create event data that matches backend schema
        // Backend expects 'date' to be a datetime, not just a date string
        const eventData = {
          title: newEvent.title,
          type: newEvent.type as Event['type'],
          date: combinedDateTime.toISOString(), // Backend expects datetime format for date field
          turnaround_time: durationInMinutes,
          description: `${newEvent.type} event`,
          priority: 'medium' as const,
          reminder: newEvent.reminder || false
        };
        
        console.log('Creating event with data:', eventData);
        
        const success = await createEvent(eventData);
        
        if (success) {
          setEventModalVisible(false);
          setNewEvent({
            date: '',
            title: '',
            type: 'custom',
            time: '',
            duration: '',
            reminder: true
          });
          
          Alert.alert('Success', 'Event created successfully!');
        } else {
          Alert.alert('Error', 'Failed to create event. Please try again.');
        }
      } catch (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'Failed to create event. Please check your connection and try again.');
      }
    } else {
      Alert.alert('Missing Information', 'Please fill in all required fields (title, date, and time).');
    }
  };

  const handleAddGoal = () => {
    if (newGoal.name && newGoal.target && newGoal.startDate && newGoal.endDate) {
      const goalData: Goal = {
        id: Date.now().toString(),
        name: newGoal.name,
        target: newGoal.target,
        current: newGoal.current || 0,
        unit: newGoal.unit || (newGoal.trackingType === 'minutes' ? 'mins' : 'sessions'),
        startDate: newGoal.startDate,
        endDate: newGoal.endDate,
        type: newGoal.type || 'focus',
        trackingType: newGoal.trackingType || 'sessions'
      };
      
      addGoal(goalData);
      setGoalModalVisible(false);
      setNewGoal({
        name: '',
        target: 10,
        current: 0,
        unit: 'sessions',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'focus',
        trackingType: 'sessions'
      });
      
      Alert.alert('Success', 'Goal added successfully!');
    } else {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeGoal(goalId);
            Alert.alert('Success', 'Goal deleted successfully!');
          }
        }
      ]
    );
  };
  
  const renderEventItem = ({ item }: { item: Event }) => {
    const getEventIcon = (type: Event['type']) => {
      return eventsService.getEventTypeIcon(type);
    };

    const handleDeleteEvent = async () => {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete "${item.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Deleting event from UI:', item.id);
                const success = await deleteEvent(item.id);
                if (success) {
                  // Refresh the events list to ensure UI is in sync
                  await refreshEvents();
                  // Don't show success message, just let it work silently
                } else {
                  Alert.alert('Error', 'Failed to delete event. Please try again.');
                }
              } catch (error) {
                console.error('Error deleting event:', error);
                // Only show error if it's not a 404 (event not found) error
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                if (!errorMessage.includes('Event not found') && !errorMessage.includes('404')) {
                  Alert.alert('Error', 'Failed to delete event. Please check your connection and try again.');
                }
                // If it's a 404 error, the event was already deleted, so don't show error to user
              }
            }
          }
        ]
      );
    };
    
    return (
      <View style={styles.eventItem}>
        <View style={[
          styles.eventIcon, 
          { backgroundColor: item.color || eventsService.getEventTypeColor(item.type) }
        ]}>
          <MaterialCommunityIcons 
            name={getEventIcon(item.type) as any} 
            size={20} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.eventDetails}>
            <Text style={styles.eventTime}>
              {eventsService.formatEventTime(item.time)}
            </Text>
            <Text style={styles.eventDuration}>{item.duration}</Text>
          </View>
          {item.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {item.location && (
            <View style={styles.eventLocation}>
              <MaterialCommunityIcons name="map-marker" size={12} color="#7a889e" />
              <Text style={styles.eventLocationText}>{item.location}</Text>
            </View>
          )}
        </View>
        <View style={styles.eventActions}>
          {item.reminder && (
            <View style={styles.reminderBadge}>
              <MaterialCommunityIcons name="bell" size={16} color="#FFFFFF" />
            </View>
          )}
          <TouchableOpacity onPress={handleDeleteEvent} style={styles.deleteEventButton}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderGoalItem = ({ item }: { item: Goal }) => {
    const rawProgress = item.current / item.target;
    const progress = Math.min(rawProgress, 1); // Cap at 100%
    const isCompleted = item.current >= item.target;
    const isOverAchieved = item.current > item.target;
    
    // Debug logging for progress calculation
    console.log(`📊 Goal "${item.name}":`, {
      current: item.current,
      target: item.target,
      rawProgress: rawProgress,
      cappedProgress: progress,
      progressPercent: `${progress * 100}%`,
      isCompleted,
      isOverAchieved
    });
    
    const getGoalIcon = (type: Goal['type']) => {
      switch(type) {
        case 'focus':
          return 'target';
        case 'stress':
          return 'meditation';
        default:
          return 'check-circle';
      }
    };
    
    return (
      <View style={[styles.goalItem, isCompleted && styles.goalItemCompleted]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalHeaderLeft}>
            <View style={[styles.goalIcon, isCompleted && styles.goalIconCompleted]}>
              <MaterialCommunityIcons 
                name={isCompleted ? 'check' : getGoalIcon(item.type) as any} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={[styles.goalTitle, isCompleted && styles.goalTitleCompleted]}>
              {item.name}
              {isCompleted && (
                <Text style={styles.completedBadge}> ✅ COMPLETED</Text>
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.goalDeleteButton}
            onPress={() => handleDeleteGoal(item.id)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
        <View style={styles.goalProgress}>
          <View style={styles.goalProgressHeader}>
            <Text style={styles.goalProgressText}>
              {isCompleted ? (
                <>
                  {item.target} / {item.target} {item.unit}
                  {isOverAchieved && (
                    <Text style={styles.overAchievedText}> (+{item.current - item.target} bonus)</Text>
                  )}
                </>
              ) : (
                `${item.current} / ${item.target} ${item.unit}`
              )}
            </Text>
            <Text style={[styles.goalProgressPercentage, isCompleted && styles.goalProgressPercentageCompleted]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View 
              style={[
                styles.goalProgressFill, 
                { 
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: isCompleted ? '#27ae60' : '#4287f5'
                },
                isCompleted && styles.goalProgressFillCompleted
              ]} 
            />
          </View>
          <Text style={styles.goalTrackingInfo}>
            Tracking: {item.trackingType === 'sessions' ? 'Session count' : 
                      item.trackingType === 'minutes' ? 'Total minutes' :
                      item.trackingType === 'focus_score' ? 'High focus sessions' :
                      item.trackingType === 'stress_episodes' ? 'Low stress days' :
                      'Real-time from EEG data'}
          </Text>
        </View>
        <Text style={styles.goalDateRange}>
          {item.startDate && item.endDate ? `${item.startDate} to ${item.endDate}` : 'Real-time tracking'}
        </Text>
      </View>
    );
  };

  const renderDetailModal = () => {
    const dateData = getSelectedDateData();
    
    if (!dateData) return null;
    
    const formattedDate = new Date(dateData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formattedDate}</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.focusStressContainer}>
              <View style={styles.metricContainer}>
                <Text style={styles.metricLabel}>Focus</Text>
                <Text style={[styles.metricValue, { color: '#4287f5' }]}>
                  {dateData.focusStress.focus.toFixed(1)}
                </Text>
                <View 
                  style={[
                    styles.metricBar, 
                    { height: `${(dateData.focusStress.focus / 3) * 100}%`, backgroundColor: '#4287f5' }
                  ]} 
                />
              </View>
              <View style={styles.metricContainer}>
                <Text style={styles.metricLabel}>Stress</Text>
                <Text style={[styles.metricValue, { color: '#FFA500' }]}>
                  {dateData.focusStress.stress.toFixed(1)}
                </Text>
                <View 
                  style={[
                    styles.metricBar, 
                    { height: `${(dateData.focusStress.stress / 3) * 100}%`, backgroundColor: '#FFA500' }
                  ]} 
                />
              </View>
              
              <View style={styles.dayInsight}>
                {dateData.focusStress.focus > 2.0 && dateData.focusStress.stress < 1.5 ? (
                  <Text style={styles.insightText}>
                    Excellent day! High focus and manageable stress levels. 👏
                  </Text>
                ) : dateData.focusStress.focus < 1.8 && dateData.focusStress.stress > 1.8 ? (
                  <Text style={styles.insightText}>
                    Challenging day with higher stress levels. Time for a break? 🧘‍♂️
                  </Text>
                ) : (
                  <Text style={styles.insightText}>
                    Balanced day with moderate focus and stress levels. 👌
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Events</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => {
                    setNewEvent({ 
                      ...newEvent, 
                      date: selectedDate 
                    });
                    setEventModalVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              
              {dateData.events.length === 0 ? (
                <Text style={styles.emptyState}>
                  No events scheduled for this day. Tap "Add" to create one.
                </Text>
              ) : (
                <View style={styles.eventsListContainer}>
                  {dateData.events.map((item: Event, index: number) => (
                    <React.Fragment key={`modal-event-${item.id}-${index}`}>
                      {renderEventItem({item})}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderAddEventModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={eventModalVisible}
        onRequestClose={() => setEventModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Event</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setEventModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Event title"
                  placeholderTextColor="#7a889e"
                  value={newEvent.title}
                  onChangeText={text => setNewEvent({ ...newEvent, title: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.typeButtonsScrollContainer}
                  contentContainerStyle={styles.typeButtonsContainer}
                >
                  {eventsService.getDefaultEventTypes().map((eventType) => (
                    <TouchableOpacity
                      key={eventType.value}
                      style={[
                        styles.typeButton,
                        newEvent.type === eventType.value && styles.typeButtonActive,
                        { borderColor: eventType.color }
                      ]}
                      onPress={() => setNewEvent({ ...newEvent, type: eventType.value })}
                    >
                      <MaterialCommunityIcons 
                        name={eventType.icon as any} 
                        size={16} 
                        color={newEvent.type === eventType.value ? "#FFFFFF" : eventType.color} 
                      />
                      <Text style={[
                        styles.typeButtonText,
                        newEvent.type === eventType.value && styles.typeButtonTextActive,
                        { color: newEvent.type === eventType.value ? "#FFFFFF" : eventType.color }
                      ]}>
                        {eventType.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Add event description..."
                  placeholderTextColor="#7a889e"
                  value={newEvent.description}
                  onChangeText={text => setNewEvent({ ...newEvent, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Event location"
                  placeholderTextColor="#7a889e"
                  value={newEvent.location}
                  onChangeText={text => setNewEvent({ ...newEvent, location: text })}
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Time</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#7a889e"
                    value={newEvent.time}
                    onChangeText={text => setNewEvent({ ...newEvent, time: text })}
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Duration</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 30 min"
                    placeholderTextColor="#7a889e"
                    value={newEvent.duration}
                    onChangeText={text => setNewEvent({ ...newEvent, duration: text })}
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <View style={styles.reminderContainer}>
                  <Text style={styles.formLabel}>Set Reminder</Text>
                  <TouchableOpacity
                    style={styles.reminderToggle}
                    onPress={() => setNewEvent({ ...newEvent, reminder: !newEvent.reminder })}
                  >
                    <View style={[
                      styles.reminderToggleTrack, 
                      newEvent.reminder && styles.reminderToggleTrackActive
                    ]}>
                      <View style={[
                        styles.reminderToggleThumb, 
                        newEvent.reminder && styles.reminderToggleThumbActive
                      ]} />
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reminderHelp}>
                  You'll receive a notification before this event.
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.submitButton, eventsLoading && styles.submitButtonDisabled]}
                onPress={handleAddEvent}
                disabled={eventsLoading}
              >
                {eventsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Event</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddGoalModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Goal</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setGoalModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Goal Title</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your goal..."
                  placeholderTextColor="#7a889e"
                  value={newGoal.name}
                  onChangeText={text => setNewGoal({ ...newGoal, name: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Goal Type</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.typeButtonsScrollContainer}
                  contentContainerStyle={styles.typeButtonsContainer}
                >
                  {[
                    { value: 'focus', label: 'Focus', icon: 'target', color: '#4287f5' },
                    { value: 'stress', label: 'Meditation', icon: 'meditation', color: '#9b59b6' },
                    { value: 'custom', label: 'Custom', icon: 'star', color: '#f39c12' }
                  ].map((goalType) => (
                    <TouchableOpacity
                      key={goalType.value}
                      style={[
                        styles.typeButton,
                        newGoal.type === goalType.value && styles.typeButtonActive,
                        { borderColor: goalType.color }
                      ]}
                      onPress={() => setNewGoal({ ...newGoal, type: goalType.value as any })}
                    >
                      <MaterialCommunityIcons 
                        name={goalType.icon as any} 
                        size={16} 
                        color={newGoal.type === goalType.value ? "#FFFFFF" : goalType.color} 
                      />
                      <Text style={[
                        styles.typeButtonText,
                        newGoal.type === goalType.value && styles.typeButtonTextActive,
                        { color: newGoal.type === goalType.value ? "#FFFFFF" : goalType.color }
                      ]}>
                        {goalType.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tracking Method</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.typeButtonsScrollContainer}
                  contentContainerStyle={styles.typeButtonsContainer}
                >
                  {[
                    { value: 'sessions', label: 'Sessions', icon: 'counter', color: '#27ae60' },
                    { value: 'minutes', label: 'Minutes', icon: 'clock-outline', color: '#3498db' },
                    { value: 'focus_score', label: 'High Focus', icon: 'brain', color: '#e74c3c' },
                    { value: 'stress_episodes', label: 'Low Stress Episodes', icon: 'sleep', color: '#9b59b6' }
                  ].map((trackingType) => (
                    <TouchableOpacity
                      key={trackingType.value}
                      style={[
                        styles.typeButton,
                        newGoal.trackingType === trackingType.value && styles.typeButtonActive,
                        { borderColor: trackingType.color }
                      ]}
                      onPress={() => setNewGoal({ ...newGoal, trackingType: trackingType.value as any })}
                    >
                      <MaterialCommunityIcons 
                        name={trackingType.icon as any} 
                        size={16} 
                        color={newGoal.trackingType === trackingType.value ? "#FFFFFF" : trackingType.color} 
                      />
                      <Text style={[
                        styles.typeButtonText,
                        newGoal.trackingType === trackingType.value && styles.typeButtonTextActive,
                        { color: newGoal.trackingType === trackingType.value ? "#FFFFFF" : trackingType.color }
                      ]}>
                        {trackingType.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Target</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="10"
                  placeholderTextColor="#7a889e"
                  value={newGoal.target?.toString()}
                  onChangeText={text => setNewGoal({ ...newGoal, target: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Start Date</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#7a889e"
                    value={newGoal.startDate}
                    onChangeText={text => setNewGoal({ ...newGoal, startDate: text })}
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>End Date</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#7a889e"
                    value={newGoal.endDate}
                    onChangeText={text => setNewGoal({ ...newGoal, endDate: text })}
                  />
                </View>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!newGoal.name || !newGoal.target || !newGoal.startDate || !newGoal.endDate) && styles.submitButtonDisabled
                ]}
                onPress={handleAddGoal}
                disabled={!newGoal.name || !newGoal.target || !newGoal.startDate || !newGoal.endDate}
              >
                <Text style={styles.submitButtonText}>Add Goal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Confetti animation values - create once and reuse
  const confettiAnimations = useRef<Animated.Value[]>([]);
  
  // Initialize confetti animations once
  useEffect(() => {
    if (confettiAnimations.current.length === 0) {
      confettiAnimations.current = Array.from({ length: 20 }, () => new Animated.Value(0));
    }
  }, []);

  const startConfettiAnimation = () => {
    // Reset all animations first
    confettiAnimations.current.forEach(anim => anim.setValue(0));
    
    // Start each animation with staggered timing
    confettiAnimations.current.forEach((animatedValue, index) => {
      setTimeout(() => {
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 4000 + Math.random() * 1000, // 4-5 seconds
          useNativeDriver: true,
        }).start();
      }, Math.random() * 800); // Stagger start times up to 800ms
    });
  };

  const renderConfetti = () => {
    if (!showConfetti) return null;

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    
    return (
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiAnimations.current.map((animatedValue, index) => {
          const translateY = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-100, 700], // Fall further down
          });

          const translateX = animatedValue.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [0, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 200],
          });

          const rotate = animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${360 + Math.random() * 720}deg`],
          });

          const opacity = animatedValue.interpolate({
            inputRange: [0, 0.1, 0.8, 1],
            outputRange: [0, 1, 1, 0],
          });

          const scale = animatedValue.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 1.3, 1, 0.7],
          });

          const isCircle = Math.random() > 0.5;
          const size = 8 + Math.random() * 10; // 8-18px - bigger pieces
          const color = colors[Math.floor(Math.random() * colors.length)];

          return (
            <Animated.View
              key={index}
              style={[
                styles.confettiPiece,
                {
                  left: `${5 + Math.random() * 90}%`, // Spread across more of the screen
                  width: size,
                  height: size,
                  backgroundColor: color,
                  borderRadius: isCircle ? size / 2 : Math.random() * 4,
                  transform: [
                    { translateY },
                    { translateX },
                    { rotate },
                    { scale },
                  ],
                  opacity,
                }
              ]}
            />
          );
        })}
        
        {/* Completion message */}
        <View style={styles.confettiMessage}>
          <Text style={styles.confettiMessageText}>🎉 Goal Completed!</Text>
          <Text style={styles.confettiSubText}>Keep up the great work!</Text>
        </View>
      </View>
    );
  };

  // Update goal progress automatically when sessions change
  useEffect(() => {
    console.log('🔄 Session update effect triggered:', {
      sessionsLength: sessions?.length || 0,
      hasSessionData: !!sessions
    });
    
    // Check for completed goals and trigger confetti
    if (goals && goals.length > 0) {
      console.log('🎯 Checking for completed goals...');
      
      const allCurrentlyCompletedGoalIds = goals
        .filter(goal => goal.current >= goal.target)
        .map(goal => goal.id);
      
      goals.forEach(goal => {
        const isCompleted = goal.current >= goal.target;
        console.log(`🎯 Goal "${goal.name}": ${goal.current}/${goal.target} (${Math.round(goal.current/goal.target*100)}%) ${isCompleted ? '✅' : ''}`);
      });
      
      // Update completed goals using functional update to avoid dependency issues
      setCompletedGoals(prevCompleted => {
        const newlyCompletedGoals = allCurrentlyCompletedGoalIds.filter(id => !prevCompleted.has(id));
        
        // Only trigger confetti for newly completed goals
        if (newlyCompletedGoals.length > 0) {
          console.log(`🎉 TRIGGERING CONFETTI for newly completed goals:`, newlyCompletedGoals);
          setShowConfetti(true);
          startConfettiAnimation();
          
          setTimeout(() => {
            setShowConfetti(false);
            console.log('🎉 New completion confetti hidden');
          }, 6000); // Show for 6 seconds
        } else if (allCurrentlyCompletedGoalIds.length > 0 && prevCompleted.size === 0) {
          // First time loading completed goals (no confetti)
          console.log('📝 Updating completed goals without confetti');
        }
        
        return new Set(allCurrentlyCompletedGoalIds);
      });
    }
  }, [goals]); // Removed completedGoals from dependencies to prevent infinite loop

  // Refresh data when screen loads
  useEffect(() => {
    refreshEvents();
    refreshSessions();
  }, []);

  // Move styles inside component to access dynamic theme colors
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background.dark,
      paddingTop: 0,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.dark,
    },
    header: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    screenTitle: {
      fontSize: getScaledFontSize(28),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    calendarContainer: {
      marginHorizontal: 16,
      marginTop: 5,
      marginBottom: 10,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.background.card,
    },
    calendar: {
      borderRadius: 16,
    },
    calendarLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
      marginBottom: 4,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 5,
    },
    legendText: {
      fontSize: getScaledFontSize(10),
      color: colors.text.secondary,
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: colors.background.card,
      borderRadius: 16,
      padding: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    addButtonText: {
      fontSize: getScaledFontSize(14),
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 4,
    },
    emptyStateContainer: {
      alignItems: 'center',
      padding: 24,
    },
    emptyState: {
      fontSize: getScaledFontSize(16),
      color: colors.text.primary,
      marginTop: 12,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginTop: 8,
      textAlign: 'center',
    },
    eventsListContainer: {
      marginTop: 8,
    },
    eventItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.background.dark,
      borderRadius: 12,
    },
    eventIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary.main,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    eventTime: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
    },
    eventActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteButton: {
      padding: 8,
    },
    eventDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventDuration: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginRight: 12,
    },
    eventDescription: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginTop: 4,
    },
    eventLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    eventLocationText: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginLeft: 4,
    },
    reminderBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary.main,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    deleteEventButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    goalsListContainer: {
      marginTop: 8,
    },
    goalItem: {
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.background.dark,
      borderRadius: 12,
    },
    goalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    goalIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary.main,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    goalContent: {
      flex: 1,
    },
    goalTitle: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    goalProgress: {
      marginTop: 8,
    },
    goalProgressText: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
    },
    goalProgressBar: {
      height: 6,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    goalProgressFill: {
      height: '100%',
      backgroundColor: colors.primary.main,
    },
    goalProgressPercentage: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.background.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 30,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: getScaledFontSize(20),
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    closeButton: {
      padding: 8,
    },
    modalContent: {
      flex: 1,
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colors.background.dark,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: getScaledFontSize(16),
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    formTextArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    typeButtonsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
    },
    typeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 4,
      marginBottom: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary.main,
      backgroundColor: 'transparent',
    },
    typeButtonActive: {
      backgroundColor: colors.primary.main,
    },
    typeButtonText: {
      fontSize: getScaledFontSize(12),
      color: colors.text.primary,
      marginLeft: 4,
    },
    typeButtonTextActive: {
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    reminderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    reminderToggle: {
      padding: 4,
    },
    reminderToggleTrack: {
      width: 50,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      justifyContent: 'center',
    },
    reminderToggleTrackActive: {
      backgroundColor: colors.primary.main,
    },
    reminderToggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#FFFFFF',
      marginLeft: 3,
    },
    reminderToggleThumbActive: {
      marginLeft: 25,
    },
    reminderHelp: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
    },
    submitButton: {
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginVertical: 20,
    },
    submitButtonDisabled: {
      backgroundColor: colors.text.secondary,
    },
    submitButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    scrollContainer: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 100,
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
      color: colors.error,
      fontSize: getScaledFontSize(16),
      marginLeft: 8,
    },
    retryButton: {
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: getScaledFontSize(16),
      fontWeight: 'bold',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    loadingText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      marginLeft: 8,
    },
    goalItemCompleted: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    goalIconCompleted: {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    },
    goalTitleCompleted: {
      color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    },
    completedBadge: {
      color: colors.primary.main,
      fontSize: getScaledFontSize(12),
      fontWeight: 'bold',
    },
    goalProgressPercentageCompleted: {
      color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    },
    goalProgressFillCompleted: {
      backgroundColor: '#27ae60',
    },
    overAchievedText: {
      color: '#F39C12',
      fontSize: getScaledFontSize(12),
      fontWeight: 'bold',
    },
    confettiContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100%',
      width: '100%',
      justifyContent: 'flex-start',
      alignItems: 'center',
      zIndex: 1000,
    },
    confettiPiece: {
      position: 'absolute',
      top: -50,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    confettiMessage: {
      position: 'absolute',
      top: 120,
      left: 20,
      right: 20,
      backgroundColor: `${colors.primary.main}F0`,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 2,
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    },
    confettiMessageText: {
      fontSize: getScaledFontSize(20),
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 6,
    },
    confettiSubText: {
      fontSize: getScaledFontSize(16),
      color: '#FFFFFF',
      opacity: 0.9,
    },
    goalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    goalDeleteButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.error}33`,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    goalProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    goalTrackingInfo: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
    },
    goalDateRange: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
    },
    focusStressContainer: {
      paddingHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    metricContainer: {
      alignItems: 'center',
      height: 120,
      justifyContent: 'flex-end',
    },
    metricLabel: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginBottom: 8,
    },
    metricValue: {
      fontSize: getScaledFontSize(18),
      fontWeight: 'bold',
      marginBottom: 8,
    },
    metricBar: {
      width: 40,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    dayInsight: {
      position: 'absolute',
      bottom: -20,
      left: 20,
      right: 20,
      backgroundColor: colors.background.card,
      borderRadius: 12,
      padding: 12,
    },
    insightText: {
      fontSize: getScaledFontSize(14),
      color: colors.text.primary,
      textAlign: 'center',
    },
    formContainer: {
      paddingHorizontal: 20,
    },
    formRow: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    modalSection: {
      paddingHorizontal: 20,
      marginTop: 20,
    },
    typeButtonsScrollContainer: {
      maxHeight: 50,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <Text style={[styles.screenTitle, { textAlign: 'center', width: '100%' }]}>Calendar</Text>
          </View>
        </View>
        
        <View style={styles.calendarContainer}>
          <Calendar
            style={styles.calendar}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: colors.background.card,
              textSectionTitleColor: colors.text.primary,
              selectedDayBackgroundColor: colors.primary.main,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.primary.main,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.text.secondary,
              dotColor: colors.primary.main,
              monthTextColor: colors.text.primary,
              arrowColor: colors.primary.main,
              textMonthFontWeight: 'bold',
              textDayFontSize: 13,
              textMonthFontSize: 15,
              textDayHeaderFontSize: 13,
              'stylesheet.calendar.main': {
                week: {
                  marginTop: 2,
                  marginBottom: 2,
                  flexDirection: 'row',
                  justifyContent: 'space-around'
                }
              }
            }}
            markingType={'custom'}
            markedDates={getMarkedDates()}
            onDayPress={handleDayPress}
            enableSwipeMonths={true}
          />
          
          <View style={[styles.calendarLegend, { backgroundColor: colors.background.card }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#27ae60' }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>High focus, low stress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#f39c12' }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>Balanced</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
              <Text style={[styles.legendText, { color: colors.text.secondary }]}>High stress, low focus</Text>
            </View>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={eventsLoading}
              onRefresh={refreshEvents}
              tintColor={colors.primary.main}
            />
          }
        >
          {eventsError && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.error} />
              <Text style={styles.errorText}>{eventsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refreshEvents}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Events</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setNewEvent({ ...newEvent, date: today });
                  setEventModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {eventsLoading && todaysEvents.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : todaysEvents.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color={colors.text.secondary} />
                <Text style={styles.emptyState}>No events scheduled for today.</Text>
                <Text style={styles.emptyStateSubtext}>
                  Time to dodge the boss? Schedule a mindful break!
                </Text>
              </View>
            ) : (
              <View style={styles.eventsListContainer}>
                {todaysEvents.map((item, index) => (
                  <React.Fragment key={`today-event-${item.id}-${index}`}>
                    {renderEventItem({ item })}
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goal Progress</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setGoalModalVisible(true)}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.goalsListContainer}>
              {goals.map(item => (
                <React.Fragment key={item.id}>
                  {renderGoalItem({ item })}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
        
        {renderDetailModal()}
        {renderAddEventModal()}
        {renderAddGoalModal()}
        {renderConfetti()}
      </View>
    </SafeAreaView>
  );
};

export default CalendarScreen; 