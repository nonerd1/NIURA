import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Use the same dark theme as DeepWorkScreen
const darkTheme = {
  background: {
    primary: '#131A2F',     // Dark blue for main background
    secondary: '#1B2444',   // Slightly lighter blue for cards/elements
    card: '#242E52',        // Card background
  },
  primary: {
    main: '#4D7BFF',        // Blue accent color
  },
  text: {
    primary: '#FFFFFF',     // White text
    secondary: '#A0A8C2',   // Light gray for secondary text
  },
  warning: '#FFB020',       // Warning color for incomplete sessions
};

// Mock data for session history
const MOCK_SESSIONS = [
  { date: '2024-03-10', duration: 45, completed: true },
  { date: '2024-03-09', duration: 25, completed: true },
  { date: '2024-03-09', duration: 60, completed: false },
  { date: '2024-03-08', duration: 90, completed: true },
  { date: '2024-03-07', duration: 45, completed: true },
];

const DeepWorkHistory = () => {
  // Calculate statistics
  const totalSessions = MOCK_SESSIONS.length;
  const completedSessions = MOCK_SESSIONS.filter(s => s.completed).length;
  const totalMinutes = MOCK_SESSIONS.reduce((acc, session) => 
    session.completed ? acc + session.duration : acc, 0
  );
  const completionRate = Math.round((completedSessions / totalSessions) * 100);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={darkTheme.primary.main} />
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={24} color={darkTheme.primary.main} />
          <Text style={styles.statValue}>{completedSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="percent-outline" size={24} color={darkTheme.primary.main} />
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Completion</Text>
        </View>
      </View>

      {/* Session Timeline */}
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {MOCK_SESSIONS.map((session, index) => (
          <View key={index} style={styles.sessionItem}>
            <View style={[
              styles.sessionStatus,
              { backgroundColor: session.completed ? darkTheme.primary.main : darkTheme.warning }
            ]} />
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
              <Text style={styles.sessionDuration}>{session.duration} minutes</Text>
            </View>
            <MaterialCommunityIcons
              name={session.completed ? "check-circle" : "close-circle"}
              size={20}
              color={session.completed ? darkTheme.primary.main : darkTheme.warning}
            />
          </View>
        ))}
      </View>

      {/* Weekly Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Weekly Insights</Text>
        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="trending-up" size={20} color={darkTheme.primary.main} />
          <Text style={styles.insightText}>
            Your most productive sessions are in the morning between 9-11 AM
          </Text>
        </View>
        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="star" size={20} color={darkTheme.primary.main} />
          <Text style={styles.insightText}>
            45-minute sessions have your highest completion rate
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background.primary,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.text.primary,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: darkTheme.text.secondary,
    textAlign: 'center',
  },
  timelineContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginBottom: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  sessionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    color: darkTheme.text.primary,
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 14,
    color: darkTheme.text.secondary,
  },
  insightsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: darkTheme.text.primary,
    lineHeight: 20,
  },
});

export default DeepWorkHistory; 