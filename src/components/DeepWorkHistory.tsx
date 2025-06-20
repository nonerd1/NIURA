import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { sessionService } from '../services/sessionService';

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

const DeepWorkHistory = () => {
  const {
    sessions,
    labels,
    stats,
    isLoading,
    error,
    refresh,
    loadMore,
    isLoadingMore,
    currentPage,
    totalPages
  } = useSessionHistory({
    per_page: 10,
    sort_by: 'start_time',
    sort_order: 'desc'
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  const getSessionTypeIcon = (sessionType: string) => {
    return sessionService.getSessionTypeIcon(sessionType);
  };

  const getSessionTypeColor = (sessionType: string) => {
    return sessionService.getSessionTypeColor(sessionType);
  };

  if (isLoading && sessions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={darkTheme.primary.main} />
        <Text style={styles.loadingText}>Loading session history...</Text>
      </View>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={darkTheme.warning} />
        <Text style={styles.errorText}>Failed to load session history</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
          tintColor={darkTheme.primary.main}
        />
      }
    >
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={darkTheme.primary.main} />
          <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={24} color={darkTheme.primary.main} />
          <Text style={styles.statValue}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="trending-up" size={24} color={darkTheme.primary.main} />
          <Text style={styles.statValue}>{stats.averageFocus.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Focus</Text>
        </View>
      </View>

      {/* Session Timeline */}
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="history" size={48} color={darkTheme.text.secondary} />
            <Text style={styles.emptyStateText}>No sessions yet</Text>
            <Text style={styles.emptyStateSubtext}>Start your first deep work session to see it here</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.sessionItem}>
              <View style={[
                styles.sessionStatus,
                { backgroundColor: getSessionTypeColor(session.session_type) }
              ]} />
              <MaterialCommunityIcons
                name={getSessionTypeIcon(session.session_type) as any}
                size={20}
                color={getSessionTypeColor(session.session_type)}
                style={styles.sessionIcon}
              />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{session.name}</Text>
                <Text style={styles.sessionDate}>{formatDate(session.start_time)}</Text>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionDuration}>
                    {formatDuration(session.actual_duration || session.planned_duration || 0)}
                  </Text>
                  {session.avg_focus && (
                    <Text style={styles.sessionFocus}>
                      Focus: {session.avg_focus.toFixed(1)}
                    </Text>
                  )}
                </View>
                {session.labels.length > 0 && (
                  <View style={styles.sessionLabels}>
                    {session.labels.slice(0, 2).map((label) => (
                      <View 
                        key={typeof label.id === 'string' ? label.id : label.id.toString()}
                        style={[styles.sessionLabel, { backgroundColor: label.color || darkTheme.primary.main }]}
                      >
                        <Text style={styles.sessionLabelText}>{label.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <MaterialCommunityIcons
                name={session.status === 'completed' ? "check-circle" : 
                      session.status === 'active' ? "play-circle" : "pause-circle"}
                size={20}
                color={session.status === 'completed' ? darkTheme.primary.main : 
                       session.status === 'active' ? '#4CAF50' : darkTheme.warning}
              />
            </View>
          ))
        )}

        {/* Load More Button */}
        {currentPage < totalPages && (
          <TouchableOpacity 
            style={styles.loadMoreButton} 
            onPress={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={darkTheme.primary.main} />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Weekly Insights */}
      {stats.totalSessions > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="trending-up" size={20} color={darkTheme.primary.main} />
            <Text style={styles.insightText}>
              Average session duration: {formatDuration(stats.averageDuration)}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="star" size={20} color={darkTheme.primary.main} />
            <Text style={styles.insightText}>
              Most used session type: {stats.mostUsedType.charAt(0).toUpperCase() + stats.mostUsedType.slice(1)}
            </Text>
          </View>
          {stats.totalFocusTime > 0 && (
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="brain" size={20} color={darkTheme.primary.main} />
              <Text style={styles.insightText}>
                High focus time: {formatDuration(stats.totalFocusTime)}
              </Text>
            </View>
          )}
        </View>
      )}
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
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: darkTheme.text.secondary,
  },
  sessionDuration: {
    fontSize: 14,
    color: darkTheme.text.secondary,
  },
  sessionFocus: {
    fontSize: 14,
    color: darkTheme.text.secondary,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sessionLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  sessionLabel: {
    padding: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  sessionLabelText: {
    fontSize: 12,
    color: darkTheme.text.primary,
  },
  sessionIcon: {
    marginRight: 12,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginBottom: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: darkTheme.text.secondary,
  },
  loadMoreButton: {
    padding: 16,
    backgroundColor: darkTheme.primary.main,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.text.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.text.primary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.warning,
    marginBottom: 16,
  },
  retryButton: {
    padding: 16,
    backgroundColor: darkTheme.primary.main,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.text.primary,
  },
});

export default DeepWorkHistory; 