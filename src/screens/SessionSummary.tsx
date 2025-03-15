import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../theme/colors';
import MetricsGraph from '../components/MetricsGraph';

type SessionSummaryRouteProp = RouteProp<RootStackParamList, 'SessionSummary'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const getFocusLevel = (averageValue: number) => {
  if (averageValue >= 2) return 'High';
  if (averageValue >= 1) return 'Medium';
  return 'Low';
};

const getStressLevel = (averageValue: number) => {
  if (averageValue >= 2) return 'High';
  if (averageValue >= 1) return 'Medium';
  return 'Low';
};

const getProductivityScore = (focusAvg: number, stressAvg: number, completionRate: number) => {
  // Convert focus to 0-100 scale
  const focusScore = (focusAvg / 3) * 100;
  
  // Invert stress (lower is better) to 0-100 scale
  const stressScore = 100 - ((stressAvg / 3) * 100);
  
  // Weighted average (focus has more weight than stress)
  return Math.round((focusScore * 0.5) + (stressScore * 0.2) + (completionRate * 0.3));
};

const SessionSummary = () => {
  const route = useRoute<SessionSummaryRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { duration, focusData, stressData, distractionCount, completedTasks, totalTasks } = route.params;
  
  // Calculate average values
  const focusAvg = focusData.reduce((acc, val) => acc + val, 0) / focusData.length;
  const stressAvg = stressData.reduce((acc, val) => acc + val, 0) / stressData.length;
  
  // Calculate productivity score (0-100)
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  const productivityScore = getProductivityScore(focusAvg, stressAvg, completionRate);
  
  // Generate time labels (one for each data point, evenly distributed)
  const generateTimeLabels = () => {
    const labels: string[] = [];
    const secondsPerPoint = duration / (focusData.length - 1);
    
    for (let i = 0; i < focusData.length; i++) {
      const secondsFromStart = i * secondsPerPoint;
      const minutes = Math.floor(secondsFromStart / 60);
      const seconds = Math.floor(secondsFromStart % 60);
      labels.push(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    
    return labels;
  };
  
  const timeLabels = generateTimeLabels();
  
  // Format the duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient 
        colors={colors.background.gradient}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Session Summary</Text>
          <View style={styles.headerRight} />
        </View>
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Productivity Score */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreTitle}>Productivity Score</Text>
              <Text style={styles.scoreValue}>{productivityScore}</Text>
              <View style={styles.scoreBarContainer}>
                <LinearGradient
                  colors={['#4D7BFF', '#64B5F6']}
                  style={[styles.scoreBar, { width: `${productivityScore}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
            
            {/* Session Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary.main} />
                <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="flash-alert" size={24} color={colors.primary.main} />
                <Text style={styles.statValue}>{distractionCount}</Text>
                <Text style={styles.statLabel}>Distractions</Text>
              </View>
              
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color={colors.primary.main} />
                <Text style={styles.statValue}>{completedTasks}/{totalTasks}</Text>
                <Text style={styles.statLabel}>Tasks</Text>
              </View>
            </View>
            
            {/* Focus Graph */}
            <View style={styles.graphCard}>
              <Text style={styles.graphTitle}>Focus & Stress Trends</Text>
              <MetricsGraph
                labels={timeLabels}
                datasets={[
                  {
                    data: focusData,
                    color: colors.primary.main,
                    label: 'Focus'
                  },
                  {
                    data: stressData,
                    color: colors.error,
                    label: 'Stress'
                  }
                ]}
                lastUpdated="End of session"
                status={{
                  level: getFocusLevel(focusAvg),
                  value: focusAvg
                }}
                type="focus"
              />
            </View>
            
            {/* Insights */}
            <View style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>Session Insights</Text>
              <View style={styles.insightItem}>
                <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.primary.main} />
                <Text style={styles.insightText}>
                  {focusAvg > 2 ? 
                    "Your focus was consistently high during this session." :
                    focusAvg > 1 ?
                    "Your focus fluctuated throughout the session." :
                    "You struggled to maintain focus during this session."
                  }
                </Text>
              </View>
              
              <View style={styles.insightItem}>
                <MaterialCommunityIcons name="chart-line" size={20} color={colors.primary.main} />
                <Text style={styles.insightText}>
                  {stressAvg < 1 ? 
                    "You maintained low stress levels, which is optimal for deep work." :
                    stressAvg < 2 ?
                    "Moderate stress levels may have affected your performance." :
                    "High stress levels likely impacted your productivity."
                  }
                </Text>
              </View>
              
              <View style={styles.insightItem}>
                <MaterialCommunityIcons name="target" size={20} color={colors.primary.main} />
                <Text style={styles.insightText}>
                  {completionRate >= 80 ? 
                    `Great job completing ${completedTasks} out of ${totalTasks} tasks!` :
                    completionRate >= 50 ?
                    `You completed ${completedTasks} out of ${totalTasks} tasks. Try breaking tasks into smaller steps.` :
                    `You only completed ${completedTasks} out of ${totalTasks} tasks. Consider setting fewer, more manageable goals.`
                  }
                </Text>
              </View>
            </View>
            
            {/* Actions */}
            <View style={styles.actionsContainer}>
              <Pressable 
                style={styles.actionButton}
                onPress={() => navigation.navigate('DeepWork')}
              >
                <Text style={styles.actionButtonText}>Start New Session</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }]
                })}
              >
                <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  scoreTitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  scoreBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  graphCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  insightsCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  insightText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 22,
  },
  actionsContainer: {
    gap: 16,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  secondaryButtonText: {
    color: colors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SessionSummary; 