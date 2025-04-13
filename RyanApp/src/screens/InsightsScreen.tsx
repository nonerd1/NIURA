import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

// Simplify the Recommendation interface
interface Recommendation {
  id: number;
  title: string;
  description: string;
  icon: string; // Keep as string but ensure actual values are valid icon names
}

const InsightsScreen = () => {
  const [timeRange, setTimeRange] = useState('weekly');
  const navigation = useNavigation();
  
  // Dummy data for charts
  const weeklyData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [2.1, 1.8, 2.5, 2.7, 2.0, 1.5, 1.7],
        color: () => '#4287f5', // Focus color
        strokeWidth: 2
      },
      {
        data: [1.3, 1.5, 1.0, 1.2, 1.8, 2.2, 2.0],
        color: () => '#FFA500', // Stress color
        strokeWidth: 2
      }
    ],
    legend: ["Focus", "Stress"]
  };

  const monthlyData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: [2.0, 2.2, 1.8, 2.1],
        color: () => '#4287f5',
        strokeWidth: 2
      },
      {
        data: [1.5, 1.3, 1.8, 1.6],
        color: () => '#FFA500',
        strokeWidth: 2
      }
    ],
    legend: ["Focus", "Stress"]
  };

  const yearlyData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        data: [1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.3, 2.1, 2.0, 1.9, 1.8, 2.0],
        color: () => '#4287f5',
        strokeWidth: 2
      },
      {
        data: [1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.3, 1.5, 1.7, 1.8, 1.9, 1.7],
        color: () => '#FFA500',
        strokeWidth: 2
      }
    ],
    legend: ["Focus", "Stress"]
  };

  // Daily pattern data (time of day)
  const dailyPatternData = {
    labels: ["Morning", "Midday", "Afternoon", "Evening", "Night"],
    data: [
      {
        focus: 2.5,
        stress: 1.2
      },
      {
        focus: 2.7,
        stress: 1.0
      },
      {
        focus: 2.2,
        stress: 1.5
      },
      {
        focus: 1.8,
        stress: 1.8
      },
      {
        focus: 1.5,
        stress: 2.0
      }
    ]
  };

  // Comparison with peers data
  const peerComparisonData = {
    labels: ["Focus", "Stress"],
    data: [
      [2.1, 1.8], // Your data
      [1.9, 1.7]  // Peer average
    ]
  };

  // Update the recommendation objects to use valid icon names
  const recommendations = [
    {
      id: 1,
      title: "Morning Focus Boost",
      description: "Your focus peaks in the morning. Schedule important tasks before noon.",
      icon: "weather-sunny" as const // Use const assertion to make TypeScript recognize this as a valid icon
    },
    {
      id: 2,
      title: "Late-Night Gaming Alert!",
      description: "Gaming after 10PM correlated with 30% lower focus the next day.",
      icon: "gamepad-variant" as const
    },
    {
      id: 3,
      title: "Caffeine Optimization",
      description: "Two cups before noon shows optimal focus without stress increase.",
      icon: "coffee" as const
    },
    {
      id: 4,
      title: "Breathing Exercise",
      description: "Try 4-7-8 breathing when stress peaks in the afternoon.",
      icon: "lungs" as const
    }
  ];

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeSelector}>
      <TouchableOpacity 
        style={[styles.timeRangeButton, timeRange === 'weekly' && styles.activeTimeRange]}
        onPress={() => setTimeRange('weekly')}
      >
        <Text style={[styles.timeRangeText, timeRange === 'weekly' && styles.activeTimeRangeText]}>Week</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.timeRangeButton, timeRange === 'monthly' && styles.activeTimeRange]}
        onPress={() => setTimeRange('monthly')}
      >
        <Text style={[styles.timeRangeText, timeRange === 'monthly' && styles.activeTimeRangeText]}>Month</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.timeRangeButton, timeRange === 'yearly' && styles.activeTimeRange]}
        onPress={() => setTimeRange('yearly')}
      >
        <Text style={[styles.timeRangeText, timeRange === 'yearly' && styles.activeTimeRangeText]}>Year</Text>
      </TouchableOpacity>
    </View>
  );

  const getCurrentData = () => {
    switch(timeRange) {
      case 'weekly':
        return weeklyData;
      case 'monthly':
        return monthlyData;
      case 'yearly':
        return yearlyData;
      default:
        return weeklyData;
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#192337',
    backgroundGradientTo: '#192337',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
    }
  };

  // Update the renderRecommendationCard function with a type assertion
  const renderRecommendationCard = (recommendation: Recommendation) => (
    <View key={recommendation.id} style={styles.recommendationCard}>
      <View style={styles.recommendationIcon}>
        <MaterialCommunityIcons 
          name={recommendation.icon as any} 
          size={24} 
          color="#64B5F6" 
        />
      </View>
      <View style={styles.recommendationContent}>
        <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
        <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Insights</Text>
        </View>

        {/* Historical Data & Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historical Trends</Text>
          <Text style={styles.sectionSubtitle}>Track your focus and stress over time</Text>
          
          {renderTimeRangeSelector()}
          
          <View style={styles.chartContainer}>
            <LineChart
              data={getCurrentData()}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
            <Text style={styles.chartCaption}>
              Pinch to zoom into specific timeframes
            </Text>
          </View>
        </View>

        {/* Deep-Dive Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deep-Dive Analysis</Text>
          <Text style={styles.sectionSubtitle}>Discover patterns in your mental state</Text>
          
          <View style={styles.analysisContainer}>
            <Text style={styles.analysisTitle}>Time of Day Impact</Text>
            <View style={styles.timeOfDayContainer}>
              {dailyPatternData.data.map((item, index) => (
                <View key={index} style={styles.timeOfDayItem}>
                  <Text style={styles.timeOfDayLabel}>{dailyPatternData.labels[index]}</Text>
                  <View style={styles.metricsContainer}>
                    <View style={[styles.metricBar, { height: item.focus * 30, backgroundColor: '#4287f5' }]} />
                    <View style={[styles.metricBar, { height: item.stress * 30, backgroundColor: '#FFA500' }]} />
                  </View>
                  <View style={styles.metricLabelsContainer}>
                    <Text style={[styles.metricLabel, { color: '#4287f5' }]}>{item.focus.toFixed(1)}</Text>
                    <Text style={[styles.metricLabel, { color: '#FFA500' }]}>{item.stress.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.insightCard}>
              <MaterialCommunityIcons 
                name={"lightbulb-on" as any} 
                size={24} 
                color="#FFD700" 
                style={styles.insightIcon} 
              />
              <Text style={styles.insightText}>
                Your focus is highest during morning and midday, while stress tends to increase in the evening.
              </Text>
            </View>
          </View>
        </View>

        {/* Actionable Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <Text style={styles.sectionSubtitle}>Tips to improve your mental readiness</Text>
          
          <View style={styles.recommendationsContainer}>
            {recommendations.map(recommendation => renderRecommendationCard(recommendation))}
          </View>
        </View>

        {/* Peer Comparisons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How You Compare</Text>
          <Text style={styles.sectionSubtitle}>Your metrics vs. anonymized population</Text>
          
          <View style={styles.peerComparisonContainer}>
            <View style={styles.comparisonLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4287f5' }]} />
                <Text style={styles.legendText}>Your Average</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: 'rgba(66, 135, 245, 0.5)' }]} />
                <Text style={styles.legendText}>Population Average</Text>
              </View>
            </View>
            
            <BarChart
              data={{
                labels: peerComparisonData.labels,
                datasets: [
                  {
                    data: [
                      peerComparisonData.data[0][0], // Your focus
                      peerComparisonData.data[0][1]  // Your stress
                    ]
                  },
                  {
                    data: [
                      peerComparisonData.data[1][0], // Peer focus
                      peerComparisonData.data[1][1]  // Peer stress
                    ],
                    colors: [
                      (opacity = 1) => `rgba(66, 135, 245, ${opacity * 0.5})`,
                      (opacity = 1) => `rgba(255, 165, 0, ${opacity * 0.5})`
                    ]
                  }
                ]
              }}
              width={screenWidth - 72}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.background.dark,
                backgroundGradientFrom: colors.background.dark,
                backgroundGradientTo: colors.background.dark,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                },
                barPercentage: 0.6,
                formatYLabel: () => '',
              }}
              style={{
                ...styles.chart,
                alignSelf: 'center',
              }}
              fromZero
              segments={3}
              showValuesOnTopOfBars
              withHorizontalLabels={false}
              withVerticalLabels={false}
            />
            
            <View style={styles.insightCard}>
              <MaterialCommunityIcons 
                name={"chart-line-variant" as any} 
                size={24} 
                color="#64B5F6" 
                style={styles.insightIcon} 
              />
              <Text style={styles.insightText}>
                Your focus is 10% higher than average, while your stress levels are comparable to peers.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1624',
  },
  contentContainer: {
    paddingBottom: 60, // Increasing bottom padding to ensure content is well above the tab bar
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  section: {
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7a889e',
    marginBottom: 15,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeRangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeTimeRange: {
    backgroundColor: '#192337',
  },
  timeRangeText: {
    color: '#7a889e',
    fontWeight: '500',
  },
  activeTimeRangeText: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#192337',
    borderRadius: 16,
    padding: 15,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 10,
  },
  chartCaption: {
    fontSize: 12,
    color: '#7a889e',
    textAlign: 'center',
    marginTop: 5,
  },
  analysisContainer: {
    backgroundColor: '#192337',
    borderRadius: 16,
    padding: 15,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  timeOfDayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 20,
  },
  timeOfDayItem: {
    alignItems: 'center',
    width: '18%',
  },
  timeOfDayLabel: {
    color: '#7a889e',
    fontSize: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 90,
    width: '100%',
    justifyContent: 'space-between',
  },
  metricBar: {
    width: '45%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  metricLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  insightCard: {
    backgroundColor: '#131d30',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  insightIcon: {
    marginRight: 15,
  },
  insightText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  recommendationsContainer: {
    marginTop: 10,
  },
  recommendationCard: {
    backgroundColor: '#192337',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131d30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#7a889e',
    lineHeight: 20,
  },
  peerComparisonContainer: {
    backgroundColor: '#192337',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 0,
    alignItems: 'center',
  },
  comparisonLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#7a889e',
  },
});

export default InsightsScreen; 