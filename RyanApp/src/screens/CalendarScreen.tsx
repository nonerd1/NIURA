import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  TextInput,
  FlatList,
  SafeAreaView
} from 'react-native';
import { Calendar, CalendarProps, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

interface Event {
  id: string;
  date: string;
  title: string;
  type: 'mindful-break' | 'workout' | 'custom';
  time: string;
  duration: string;
  reminder: boolean;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  type: 'focus' | 'stress' | 'custom';
}

interface FocusStressData {
  [date: string]: {
    focus: number;
    stress: number;
    marked?: boolean;
    dotColor?: string;
  };
}

const CalendarScreen = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [eventModalVisible, setEventModalVisible] = useState<boolean>(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    date: '',
    title: '',
    type: 'custom',
    time: '',
    duration: '',
    reminder: true
  });
  
  // Dummy data for events
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      date: '2023-07-10',
      title: 'Morning Meditation',
      type: 'mindful-break',
      time: '08:00',
      duration: '15 min',
      reminder: true
    },
    {
      id: '2',
      date: '2023-07-10',
      title: 'Evening Workout',
      type: 'workout',
      time: '18:00',
      duration: '45 min',
      reminder: true
    },
    {
      id: '3',
      date: '2023-07-12',
      title: 'Team Meeting (Deep Work)',
      type: 'custom',
      time: '10:00',
      duration: '60 min',
      reminder: true
    }
  ]);
  
  // Dummy data for goals
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Reduce stress episodes by 10%',
      target: 10,
      current: 4,
      startDate: '2023-07-01',
      endDate: '2023-07-31',
      type: 'stress'
    },
    {
      id: '2',
      title: 'Maintain focus above 2.0 for 5 consecutive days',
      target: 5,
      current: 3,
      startDate: '2023-07-05',
      endDate: '2023-07-15',
      type: 'focus'
    },
    {
      id: '3',
      title: 'Complete 10 mindful breaks',
      target: 10,
      current: 7,
      startDate: '2023-07-01',
      endDate: '2023-07-31',
      type: 'custom'
    }
  ]);
  
  // Dummy data for focus/stress levels by date
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

  // Create marked dates for the calendar based on events and focus/stress levels
  const getMarkedDates = () => {
    const markedDates: any = {};
    
    // Mark dates with events
    events.forEach(event => {
      if (!markedDates[event.date]) {
        markedDates[event.date] = { marked: true, dotColor: '#4287f5' };
      }
    });
    
    // Color code dates based on focus/stress levels
    Object.entries(focusStressData).forEach(([date, data]) => {
      // Calculate a color based on focus and stress levels
      // High focus, low stress = Green
      // Low focus, high stress = Red
      // Balanced = Yellow
      
      const focusLevel = data.focus;
      const stressLevel = data.stress;
      
      let backgroundColor = 'transparent';
      
      if (focusLevel > 2.0 && stressLevel < 1.5) {
        backgroundColor = 'rgba(66, 230, 85, 0.1)'; // Green for good days
      } else if (focusLevel < 1.8 && stressLevel > 1.8) {
        backgroundColor = 'rgba(230, 66, 66, 0.1)'; // Red for stressful days
      } else {
        backgroundColor = 'rgba(230, 185, 66, 0.1)'; // Yellow for average days
      }
      
      markedDates[date] = {
        ...markedDates[date],
        customStyles: {
          container: {
            backgroundColor
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '400'
          }
        }
      };
      
      // If this is the selected date, highlight it
      if (date === selectedDate) {
        markedDates[date] = {
          ...markedDates[date],
          selected: true,
          selectedColor: '#192337',
          customStyles: {
            ...markedDates[date]?.customStyles,
            text: {
              color: '#FFFFFF',
              fontWeight: 'bold'
            }
          }
        };
      }
    });
    
    return markedDates;
  };
  
  // Get data for the selected date
  const getSelectedDateData = () => {
    if (!selectedDate) return null;
    
    return {
      date: selectedDate,
      events: events.filter(event => event.date === selectedDate),
      focusStress: focusStressData[selectedDate] || { focus: 0, stress: 0 }
    };
  };
  
  // Handle date selection
  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };
  
  // Add a new event
  const handleAddEvent = () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      const event: Event = {
        id: Date.now().toString(),
        date: newEvent.date || selectedDate,
        title: newEvent.title || '',
        type: newEvent.type || 'custom',
        time: newEvent.time || '',
        duration: newEvent.duration || '30 min',
        reminder: newEvent.reminder !== undefined ? newEvent.reminder : true
      };
      
      setEvents([...events, event]);
      setNewEvent({
        date: '',
        title: '',
        type: 'custom',
        time: '',
        duration: '',
        reminder: true
      });
      setEventModalVisible(false);
    }
  };
  
  // Render an event item
  const renderEventItem = ({ item }: { item: Event }) => {
    const getEventIcon = (type: Event['type']) => {
      switch(type) {
        case 'mindful-break':
          return 'meditation';
        case 'workout':
          return 'weight-lifter';
        default:
          return 'calendar-check';
      }
    };
    
    return (
      <View style={styles.eventItem}>
        <View style={styles.eventIcon}>
          <MaterialCommunityIcons 
            name={getEventIcon(item.type) as any} 
            size={20} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.eventDetails}>
            <Text style={styles.eventTime}>{item.time}</Text>
            <Text style={styles.eventDuration}>{item.duration}</Text>
          </View>
        </View>
        {item.reminder && (
          <View style={styles.reminderBadge}>
            <MaterialCommunityIcons name="bell" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
    );
  };
  
  // Render a goal progress item
  const renderGoalItem = ({ item }: { item: Goal }) => {
    const progress = item.current / item.target;
    
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
      <View style={styles.goalItem}>
        <View style={styles.goalHeader}>
          <View style={styles.goalIcon}>
            <MaterialCommunityIcons 
              name={getGoalIcon(item.type) as any} 
              size={20} 
              color="#FFFFFF" 
            />
          </View>
          <Text style={styles.goalTitle}>{item.title}</Text>
        </View>
        <View style={styles.goalProgressContainer}>
          <View style={styles.goalProgress}>
            <View style={[styles.goalProgressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.goalProgressText}>
            {item.current} / {item.target} 
            <Text style={styles.goalProgressPercentage}>
              ({Math.round(progress * 100)}%)
            </Text>
          </Text>
        </View>
        <Text style={styles.goalDateRange}>
          {item.startDate} to {item.endDate}
        </Text>
      </View>
    );
  };

  // Detailed Day Modal
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
                  {dateData.events.map(item => (
                    <React.Fragment key={item.id}>
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
  
  // Add Event Modal
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
                <View style={styles.typeButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newEvent.type === 'mindful-break' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, type: 'mindful-break' })}
                  >
                    <MaterialCommunityIcons name="meditation" size={16} color="#FFFFFF" />
                    <Text style={styles.typeButtonText}>Mindful Break</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newEvent.type === 'workout' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, type: 'workout' })}
                  >
                    <MaterialCommunityIcons name="weight-lifter" size={16} color="#FFFFFF" />
                    <Text style={styles.typeButtonText}>Workout</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newEvent.type === 'custom' && styles.typeButtonActive
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, type: 'custom' })}
                  >
                    <MaterialCommunityIcons name="calendar-check" size={16} color="#FFFFFF" />
                    <Text style={styles.typeButtonText}>Custom</Text>
                  </TouchableOpacity>
                </View>
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
                style={styles.submitButton}
                onPress={handleAddEvent}
              >
                <Text style={styles.submitButtonText}>Create Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Calendar</Text>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="calendar-plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Calendar */}
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
              <View style={[styles.legendColor, { backgroundColor: 'rgba(66, 230, 85, 0.1)' }]} />
              <Text style={styles.legendText}>High focus, low stress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: 'rgba(230, 185, 66, 0.1)' }]} />
              <Text style={styles.legendText}>Balanced</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: 'rgba(230, 66, 66, 0.1)' }]} />
              <Text style={styles.legendText}>High stress, low focus</Text>
            </View>
          </View>
        </View>
        
        {/* Scrollable content area - Use contentContainer instead of direct nesting */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Today's Events */}
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
            
            {events.filter(event => event.date === new Date().toISOString().split('T')[0]).length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#7a889e" />
                <Text style={styles.emptyState}>No events scheduled for today.</Text>
                <Text style={styles.emptyStateSubtext}>
                  Time to dodge the boss? Schedule a mindful break!
                </Text>
              </View>
            ) : (
              <View style={styles.eventsListContainer}>
                {events
                  .filter(event => event.date === new Date().toISOString().split('T')[0])
                  .map(item => (
                    <React.Fragment key={item.id}>
                      {renderEventItem({ item })}
                    </React.Fragment>
                  ))}
              </View>
            )}
          </View>
          
          {/* Goal Progress */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goal Progress</Text>
              <TouchableOpacity style={styles.addButton}>
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
        
        {/* Render Modals */}
        {renderDetailModal()}
        {renderAddEventModal()}
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
  reminderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4287f5',
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
    marginBottom: 12,
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
  goalProgressContainer: {
    marginBottom: 8,
  },
  goalProgress: {
    height: 8,
    backgroundColor: '#313e5c',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#4287f5',
    borderRadius: 4,
  },
  goalProgressText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  goalProgressPercentage: {
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
    justifyContent: 'space-between',
  },
  typeButton: {
    backgroundColor: '#192337',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  typeButtonActive: {
    backgroundColor: '#4287f5',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
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
    paddingBottom: 100, // Extra space for bottom tabs
  },
});

export default CalendarScreen; 