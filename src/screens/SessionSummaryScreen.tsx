import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Pressable, 
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, NavigationProp } from '../types/navigation';
import { LineChart } from 'react-native-chart-kit';

type SessionSummaryScreenProps = {
  route: RouteProp<RootStackParamList, 'SessionSummary'>;
};

const SessionSummaryScreen = ({ route }: SessionSummaryScreenProps) => {
  const { 
    duration,
    focusData,
    stressData,
    distractionCount,
    completedTasks,
    totalTasks
  } = route.params;
  
  const navigation = useNavigation<NavigationProp>();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  
  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  };
  
  // Calculate productivity score (0-100)
  const productivityScore = Math.min(100, Math.max(0, 
    Math.round(
      (100 - (distractionCount * 5)) * 
      (totalTasks > 0 ? (completedTasks / totalTasks) * 0.5 + 0.5 : 1)
    )
  ));
  
  // Determine performance level based on score
  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: '#4CAF50' };
    if (score >= 70) return { text: 'Good', color: '#8BC34A' };
    if (score >= 50) return { text: 'Average', color: '#FFC107' };
    if (score >= 30) return { text: 'Fair', color: '#FF9800' };
    return { text: 'Poor', color: '#F44336' };
  };
  
  const performance = getPerformanceLevel(productivityScore);
  
  // Render a chart if we have focus/stress data
  const renderMetricsChart = () => {
    if (!focusData || !stressData || focusData.length === 0 || stressData.length === 0) {
      return null;
    }
    
    // Create evenly spaced labels based on session duration
    const totalPoints = focusData.length;
    const labels = Array.from({ length: Math.min(6, totalPoints) }, (_, i) => {
      const percentage = i / (Math.min(6, totalPoints) - 1);
      const timePoint = Math.floor(percentage * duration);
      const mins = Math.floor(timePoint / 60);
      return `${mins}m`;
    });
    
    // Create chart data with fixed y-axis scale
    const chartData = {
      labels,
      datasets: [
        {
          data: focusData,
          color: () => colors.primary.main,
          strokeWidth: 2,
        },
        {
          data: stressData,
          color: () => '#FF6384',
          strokeWidth: 2,
        },
        {
          // Hidden dataset with point at 3.0 to force y-axis scale
          data: [3],
          color: () => 'transparent',
          strokeWidth: 0,
          withDots: false,
        }
      ],
      legend: ['Focus', 'Stress']
    };
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Session Metrics</Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary.main }]} />
            <Text style={styles.legendText}>Focus</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6384' }]} />
            <Text style={styles.legendText}>Stress</Text>
          </View>
        </View>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: colors.background.card,
            backgroundGradientFrom: colors.background.card,
            backgroundGradientTo: colors.background.card,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: () => colors.text.secondary,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
            },
            propsForBackgroundLines: {
              stroke: 'rgba(255, 255, 255, 0.1)',
              strokeDasharray: '5,5',
            },
            propsForVerticalLabels: {
              fontSize: 10,
              rotation: 0,
            },
            formatYLabel: (yLabel) => Number(yLabel).toFixed(1),
          }}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={true}
          yAxisInterval={1}
          segments={4}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Session Summary</Text>
        <Pressable 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </Pressable>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>{productivityScore}</Text>
            <Text style={[styles.performanceText, { color: performance.color }]}>
              {performance.text}
            </Text>
          </View>
        </View>
        
        {/* Session Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary.main} />
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="bell-off-outline" size={24} color="#FF9800" />
            <Text style={styles.statValue}>{distractionCount}</Text>
            <Text style={styles.statLabel}>Distractions</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="check-circle-outline" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{completedTasks}/{totalTasks}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
        </View>
        
        {/* Metrics Chart */}
        {renderMetricsChart()}
        
        {/* Feedback and Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Session Insights</Text>
          
          <View style={styles.insightItem}>
            <Ionicons name="bulb-outline" size={20} color="#FFC107" style={styles.insightIcon} />
            <Text style={styles.insightText}>
              {distractionCount > 3 
                ? "You had several distractions. Consider turning on Do Not Disturb mode for your next session."
                : "Great focus! You maintained concentration throughout most of your session."}
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Ionicons name="trending-up" size={20} color={colors.primary.main} style={styles.insightIcon} />
            <Text style={styles.insightText}>
              {completedTasks > 0 
                ? `You completed ${completedTasks} task${completedTasks > 1 ? 's' : ''} during this session.`
                : "Try breaking down your work into smaller tasks to track progress better."}
            </Text>
          </View>
          
          <View style={styles.insightItem}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" style={styles.insightIcon} />
            <Text style={styles.insightText}>
              {duration >= 25 * 60 
                ? "You completed a full Pomodoro session. Great work maintaining focus!"
                : "For optimal productivity, aim for focused sessions of 25 minutes or more."}
            </Text>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => {
              navigation.navigate('DeepWork');
            }}
          >
            <Text style={styles.actionButtonText}>Start New Session</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              navigation.navigate('MainTabs', { screen: 'Home' });
            }}
          >
            <Text style={styles.secondaryButtonText}>Return Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.primary.main,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  performanceText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  insightsContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  insightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});

export default SessionSummaryScreen; 