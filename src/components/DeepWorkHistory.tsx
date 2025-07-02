import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { sessionService } from '../services/sessionService';
import { useTheme } from '../context/ThemeContext';

const DeepWorkHistory = () => {
  const { colors, getScaledFontSize, isDarkMode } = useTheme();
  
  // Move styles inside component to access dynamic theme colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.dark,
    },
    contentContainer: {
      paddingBottom: 80,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
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
      backgroundColor: colors.background.card,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    statValue: {
      fontSize: getScaledFontSize(24),
      fontWeight: '700',
      color: colors.text.primary,
      marginVertical: 8,
    },
    statLabel: {
      fontSize: getScaledFontSize(12),
      color: colors.text.secondary,
      textAlign: 'center',
    },
    timelineContainer: {
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600',
      color: colors.text.primary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.card,
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
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    sessionDate: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
    },
    sessionDuration: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
    },
    sessionFocus: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
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
      fontSize: getScaledFontSize(12),
      color: colors.text.primary,
    },
    sessionIcon: {
      marginRight: 12,
    },
    sessionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dismissButton: {
      padding: 4,
    },
    insightsContainer: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    insightText: {
      flex: 1,
      marginLeft: 12,
      fontSize: getScaledFontSize(14),
      color: colors.text.primary,
      lineHeight: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600',
      color: colors.text.primary,
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: getScaledFontSize(14),
      color: colors.text.secondary,
      marginTop: 8,
      textAlign: 'center',
    },
    loadMoreButton: {
      padding: 16,
      backgroundColor: colors.primary.main,
      borderRadius: 8,
      alignItems: 'center',
    },
    loadMoreText: {
      color: '#FFFFFF',
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
    },
    loadingText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      marginTop: 16,
    },
    errorText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      textAlign: 'center',
      marginVertical: 16,
    },
    retryButton: {
      backgroundColor: colors.primary.main,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: getScaledFontSize(16),
      fontWeight: '600',
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.card,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    undoButtonText: {
      color: colors.primary.main,
      fontSize: getScaledFontSize(12),
      fontWeight: '500',
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    clearButtonText: {
      color: colors.text.secondary,
      fontSize: getScaledFontSize(12),
      fontWeight: '500',
    },
  });

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

  // State for dismissed sessions (frontend-only)
  const [dismissedSessions, setDismissedSessions] = useState<Set<string>>(new Set());

  // Filter out dismissed sessions
  const visibleSessions = sessions?.filter(session => !dismissedSessions.has(session.id)) || [];

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

  const dismissSession = useCallback((sessionId: string) => {
    setDismissedSessions(prev => new Set([...prev, sessionId]));
  }, []);

  const clearAllSessions = useCallback(() => {
    Alert.alert(
      'Clear All Sessions',
      'This will hide all sessions from your view. You can refresh to see them again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            const allSessionIds = sessions?.map(s => s.id) || [];
            setDismissedSessions(new Set(allSessionIds));
          }
        }
      ]
    );
  }, [sessions]);

  const undoAllDismissals = useCallback(() => {
    setDismissedSessions(new Set());
  }, []);

  if (isLoading && (!sessions || sessions.length === 0)) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading session history...</Text>
      </View>
    );
  }

  if (error && (!sessions || sessions.length === 0)) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.warning} />
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
          tintColor={colors.primary.main}
        />
      }
    >
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary.main} />
          <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={24} color={colors.primary.main} />
          <Text style={styles.statValue}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="trending-up" size={24} color={colors.primary.main} />
          <Text style={styles.statValue}>{stats.averageFocus.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Focus</Text>
        </View>
      </View>

      {/* Session Timeline */}
      <View style={styles.timelineContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          <View style={styles.headerActions}>
            {dismissedSessions.size > 0 && (
              <TouchableOpacity style={styles.undoButton} onPress={undoAllDismissals}>
                <MaterialCommunityIcons name="undo" size={16} color={colors.primary.main} />
                <Text style={styles.undoButtonText}>Restore ({dismissedSessions.size})</Text>
              </TouchableOpacity>
            )}
            {visibleSessions.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearAllSessions}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {(!visibleSessions || visibleSessions.length === 0) ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="history" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyStateText}>
              {dismissedSessions.size > 0 ? 'All sessions hidden' : 'No sessions yet'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {dismissedSessions.size > 0 ? 'Tap "Restore" to show hidden sessions' : 'Start your first deep work session to see it here'}
            </Text>
          </View>
        ) : (
          visibleSessions.map((session) => (
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
                <Text style={styles.sessionName}>{session.name.replace(/\s*\[[^\]]+\]$/, '')}</Text>
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
                        style={[styles.sessionLabel, { backgroundColor: label.color || colors.primary.main }]}
                      >
                        <Text style={styles.sessionLabelText}>{label.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.sessionActions}>
                <MaterialCommunityIcons
                  name={session.status === 'completed' ? "check-circle" : 
                        session.status === 'active' ? "play-circle" : "pause-circle"}
                  size={20}
                  color={session.status === 'completed' ? colors.primary.main : 
                         session.status === 'active' ? '#4CAF50' : colors.warning}
                />
                <TouchableOpacity 
                  style={styles.dismissButton}
                  onPress={() => dismissSession(session.id)}
                >
                  <MaterialCommunityIcons name="close" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
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
              <ActivityIndicator size="small" color={colors.primary.main} />
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
            <MaterialCommunityIcons name="trending-up" size={20} color={colors.primary.main} />
            <Text style={styles.insightText}>
              Average session duration: {formatDuration(stats.averageDuration)}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="star" size={20} color={colors.primary.main} />
            <Text style={styles.insightText}>
              Most used session type: {stats.mostUsedType.charAt(0).toUpperCase() + stats.mostUsedType.slice(1)}
            </Text>
          </View>
          {stats.totalFocusTime > 0 && (
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="brain" size={20} color={colors.primary.main} />
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

export default DeepWorkHistory; 