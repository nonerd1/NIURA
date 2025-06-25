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

const screenWidth = Dimensions.get('window').width;

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  type: 'focus' | 'stress' | 'custom';
  trackingType: 'sessions' | 'minutes' | 'focus_score' | 'stress_episodes' | 'manual';
  targetMetric?: string; // e.g., 'focus_sessions', 'meditation_minutes', 'low_stress_days'
}

interface FocusStressData {
  [date: string]: {
    focus: number;
    stress: number;
    marked?: boolean;
    dotColor?: string;
  };
}

// Goal tracking service
class GoalTrackingService {
  static calculateGoalProgress(goal: Goal, sessions: any[]): number {
    if (!sessions || sessions.length === 0) return goal.current;
    
    const goalStartDate = new Date(goal.startDate);
    const goalEndDate = new Date(goal.endDate);
    
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
        title: 'Complete 10 focus sessions this month',
        target: 10,
        current: 0,
        startDate: monthStart,
        endDate: monthEnd,
        type: 'focus',
        trackingType: 'sessions',
        targetMetric: 'focus_sessions'
      },
      {
        id: '2',
        title: 'Meditate for 60 minutes this month',
        target: 60,
        current: 0,
        startDate: monthStart,
        endDate: monthEnd,
        type: 'stress',
        trackingType: 'minutes',
        targetMetric: 'meditation_minutes'
      },
      {
        id: '3',
        title: 'Achieve high focus in 5 sessions',
        target: 5,
        current: 0,
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
    title: '',
    target: 10,
    current: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    type: 'focus',
    trackingType: 'sessions'
  });
  
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Complete Deep Work Sessions',
      target: 10,
      current: 0,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      type: 'stress',
      trackingType: 'sessions'
    },
    {
      id: '2',
      title: 'Focus Training Hours',
      target: 25,
      current: 0,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      type: 'focus',
      trackingType: 'minutes'
    },
    {
      id: '3',
      title: 'Mindfulness Practice',
      target: 15,
      current: 0,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      type: 'custom',
      trackingType: 'sessions'
    }
  ]);
  
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
    
    // First, add event markers
    events.forEach(event => {
      const eventDate = event.date;
      if (eventDate && !markedDates[eventDate]) {
        markedDates[eventDate] = { marked: true, dotColor: '#4287f5' };
      }
    });
    
    // Then, add focus/stress heat map colors
    Object.entries(focusStressData).forEach(([date, data]) => {
      const focusLevel = data.focus;
      const stressLevel = data.stress;
      
      // Calculate a heat map score: higher focus and lower stress = better (green)
      // Lower focus and higher stress = worse (red)
      const focusScore = Math.min(Math.max(focusLevel, 0), 5); // Clamp between 0-5
      const stressScore = Math.min(Math.max(stressLevel, 0), 5); // Clamp between 0-5
      
      // Create a combined score: focus is positive, stress is negative
      const combinedScore = focusScore - stressScore;
      
      let textColor = '#FFFFFF';
      let backgroundColor = 'transparent';
      
      // Create a heat map with 5 color levels
      if (combinedScore >= 2) {
        // Very good day: high focus, low stress
        backgroundColor = '#27ae60'; // Bright green
        textColor = '#FFFFFF';
      } else if (combinedScore >= 1) {
        // Good day: decent focus, moderate stress
        backgroundColor = '#2ecc71'; // Green
        textColor = '#FFFFFF';
      } else if (combinedScore >= -0.5) {
        // Neutral day: balanced
        backgroundColor = '#f39c12'; // Orange
        textColor = '#FFFFFF';
      } else if (combinedScore >= -1.5) {
        // Bad day: low focus, high stress
        backgroundColor = '#e74c3c'; // Red
        textColor = '#FFFFFF';
      } else {
        // Very bad day: very low focus, very high stress
        backgroundColor = '#c0392b'; // Dark red
        textColor = '#FFFFFF';
      }
      
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
          selectedColor: 'transparent', // Don't override our custom color
          customStyles: {
            ...markedDates[date]?.customStyles,
            container: {
              ...markedDates[date]?.customStyles?.container,
              borderWidth: 3,
              borderColor: '#4287f5',
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
        const eventData = {
          title: newEvent.title,
          type: newEvent.type as Event['type'],
          datetime: combinedDateTime.toISOString(),
          date: eventDate,
          time: eventTime,
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
    if (newGoal.title && newGoal.target && newGoal.startDate && newGoal.endDate) {
      const goalData: Goal = {
        id: Date.now().toString(),
        title: newGoal.title,
        target: newGoal.target,
        current: newGoal.current || 0,
        startDate: newGoal.startDate,
        endDate: newGoal.endDate,
        type: newGoal.type || 'focus',
        trackingType: newGoal.trackingType || 'sessions'
      };
      
      setGoals(prevGoals => [...prevGoals, goalData]);
      setGoalModalVisible(false);
      setNewGoal({
        title: '',
        target: 10,
        current: 0,
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
            setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
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
    console.log(`📊 Goal "${item.title}":`, {
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
              {item.title}
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
                  {item.target} / {item.target}
                  {isOverAchieved && (
                    <Text style={styles.overAchievedText}> (+{item.current - item.target} bonus)</Text>
                  )}
                </>
              ) : (
                `${item.current} / ${item.target}`
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
                      'Manual updates'}
          </Text>
        </View>
        <Text style={styles.goalDateRange}>
          {item.startDate} to {item.endDate}
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
                  value={newGoal.title}
                  onChangeText={text => setNewGoal({ ...newGoal, title: text })}
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
                    { value: 'manual', label: 'Manual', icon: 'hand-back-left', color: '#95a5a6' }
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
                  (!newGoal.title || !newGoal.target || !newGoal.startDate || !newGoal.endDate) && styles.submitButtonDisabled
                ]}
                onPress={handleAddGoal}
                disabled={!newGoal.title || !newGoal.target || !newGoal.startDate || !newGoal.endDate}
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

  // Check for confetti when screen is focused and goals are loaded
  useEffect(() => {
    // Simple confetti trigger for completed goals
    const completedGoalIds = goals.filter(goal => goal.current >= goal.target).map(g => g.id);
    
    console.log('🎯 Screen focus confetti check:', {
      completedGoalIds,
      currentCompletedSize: completedGoals.size,
      shouldTrigger: completedGoalIds.length > 0 && completedGoals.size === 0
    });
    
    if (completedGoalIds.length > 0 && completedGoals.size === 0) {
      console.log('🎉 TRIGGERING WELCOME CONFETTI!');
      setCompletedGoals(new Set(completedGoalIds));
      setShowConfetti(true);
      startConfettiAnimation();
      
      setTimeout(() => {
        setShowConfetti(false);
        console.log('🎉 Welcome confetti hidden');
      }, 6000); // Show for 6 seconds to let animation complete
    }
  }, [goals, completedGoals.size]);

  // Update goal progress automatically when sessions change
  useEffect(() => {
    console.log('🔄 Session update effect triggered:', {
      sessionsLength: sessions?.length || 0,
      completedGoalsSize: completedGoals.size,
      hasSessionData: !!sessions
    });
    
    if (sessions && sessions.length > 0) {
      console.log('🎯 Updating goal progress with', sessions.length, 'sessions');
      
      const newlyCompletedGoals = new Set<string>();
      const allCompletedGoals = new Set<string>();
      
      setGoals(prevGoals => 
        prevGoals.map(goal => {
          const newProgress = GoalTrackingService.calculateGoalProgress(goal, sessions);
          const isCompleted = newProgress >= goal.target;
          const wasCompleted = completedGoals.has(goal.id);
          
          // Track all completed goals
          if (isCompleted) {
            allCompletedGoals.add(goal.id);
          }
          
          // Track newly completed goals (not previously completed)
          if (isCompleted && !wasCompleted) {
            newlyCompletedGoals.add(goal.id);
          }
          
          console.log(`🎯 Goal "${goal.title}": ${goal.current} → ${newProgress} (${Math.round(newProgress/goal.target*100)}%) ${isCompleted ? '✅' : ''}`);
          
          return {
            ...goal,
            current: newProgress
          };
        })
      );
      
      // Only trigger confetti for newly completed goals (not welcome confetti)
      if (newlyCompletedGoals.size > 0) {
        console.log(`🎉 TRIGGERING CONFETTI for newly completed goals:`, Array.from(newlyCompletedGoals));
        setCompletedGoals(prev => new Set([...prev, ...newlyCompletedGoals]));
        setShowConfetti(true);
        startConfettiAnimation();
        
        setTimeout(() => {
          setShowConfetti(false);
          console.log('🎉 New completion confetti hidden');
        }, 6000); // Show for 6 seconds
      } else if (allCompletedGoals.size > 0) {
        // Update completed goals set without confetti (welcome confetti handled separately)
        console.log('📝 Updating completed goals without confetti');
        setCompletedGoals(prev => new Set([...prev, ...allCompletedGoals]));
      }
    }
  }, [sessions]);

  // Refresh data when screen loads
  useEffect(() => {
    refreshEvents();
    refreshSessions();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Calendar</Text>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="calendar-plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarContainer}>
          <Calendar
            style={styles.calendar}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: '#192337',
              textSectionTitleColor: '#FFFFFF',
              selectedDayBackgroundColor: '#4287f5',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#4287f5',
              dayTextColor: '#FFFFFF',
              textDisabledColor: '#7a889e',
              dotColor: '#4287f5',
              monthTextColor: '#FFFFFF',
              arrowColor: '#64B5F6',
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
          
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#27ae60' }]} />
              <Text style={styles.legendText}>High focus, low stress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.legendText}>Balanced</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>High stress, low focus</Text>
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
              tintColor="#4287f5"
            />
          }
        >
          {eventsError && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#FF6B6B" />
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
                <ActivityIndicator size="large" color="#4287f5" />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : todaysEvents.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#7a889e" />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0E1624',
    paddingTop: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#0E1624',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#192337',
    alignItems: 'center',
    justifyContent: 'center'
  },
  calendarContainer: {
    marginHorizontal: 16,
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#192337',
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
    borderTopColor: '#313e5c',
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
    fontSize: 10,
    color: '#7a889e',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#192337',
    borderRadius: 16,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#131d30',
    borderRadius: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    color: '#7a889e',
    fontSize: 16,
    marginVertical: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#7a889e',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  eventsListContainer: {
    paddingTop: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131d30',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4287f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 14,
    color: '#7a889e',
    marginRight: 12,
  },
  eventDuration: {
    fontSize: 14,
    color: '#7a889e',
  },
  eventDescription: {
    fontSize: 14,
    color: '#7a889e',
    marginTop: 4,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventLocationText: {
    fontSize: 14,
    color: '#7a889e',
    marginLeft: 4,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4287f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteEventButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  goalsListContainer: {
    paddingTop: 8,
  },
  goalItem: {
    backgroundColor: '#131d30',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4287f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  goalDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  goalProgress: {
    marginBottom: 8,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalProgressText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  goalProgressPercentage: {
    color: '#7a889e',
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: '#313e5c',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#4287f5',
    borderRadius: 4,
    minWidth: 2, // Ensure there's always some visible progress
  },
  goalTrackingInfo: {
    fontSize: 12,
    color: '#7a889e',
  },
  goalDateRange: {
    fontSize: 12,
    color: '#7a889e',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#0E1624',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 48,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#192337',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSection: {
    paddingHorizontal: 20,
    marginTop: 20,
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
    fontSize: 14,
    color: '#7a889e',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
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
    backgroundColor: '#192337',
    borderRadius: 12,
    padding: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#192337',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  typeButtonsScrollContainer: {
    maxHeight: 50,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4287f5',
    backgroundColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#4287f5',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  typeButtonTextActive: {
    fontWeight: 'bold',
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
    backgroundColor: '#313e5c',
    justifyContent: 'center',
  },
  reminderToggleTrackActive: {
    backgroundColor: '#4287f5',
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
    fontSize: 12,
    color: '#7a889e',
  },
  submitButton: {
    backgroundColor: '#4287f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  submitButtonText: {
    fontSize: 16,
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
  formTextArea: {
    height: 80,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#131d30',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#4287f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#7a889e',
  },
  goalItemCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalIconCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  goalTitleCompleted: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  completedBadge: {
    color: '#4287f5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goalProgressPercentageCompleted: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  goalProgressFillCompleted: {
    backgroundColor: '#27ae60',
  },
  overAchievedText: {
    color: '#F39C12',
    fontSize: 12,
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
    backgroundColor: 'rgba(66, 135, 245, 0.95)',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confettiMessageText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  confettiSubText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});

export default CalendarScreen; 