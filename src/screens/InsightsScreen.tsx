import React, { useState, useEffect } from 'react';
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
import { eegService, Recommendation as BackendRecommendation, AggregateRange } from '../services/eegService';

const screenWidth = Dimensions.get('window').width;

// Simplify the Recommendation interface
interface Recommendation {
  id: number;
  title: string;
  description: string;
  icon: string; // Keep as string but ensure actual values are valid icon names
}

const InsightsScreen = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<AggregateRange>('weekly');
  const [selectedDataType, setSelectedDataType] = useState('focus');
  const [backendRecommendations, setBackendRecommendations] = useState<BackendRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [aggregateData, setAggregateData] = useState<any>(null);
  const [isLoadingAggregate, setIsLoadingAggregate] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    loadAggregateData();
  }, [selectedTimeRange]);

  const loadRecommendations = async () => {
    try {
      const recs = await eegService.getRecommendations();
      setBackendRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const loadAggregateData = async () => {
    console.log('loadAggregateData starting for range:', selectedTimeRange);
    setIsLoadingAggregate(true);
    try {
      const data = await eegService.getEEGAggregate(selectedTimeRange);
      console.log('Raw aggregate data received:', { 
        hasData: !!data, 
        dataLength: data?.data?.length,
        range: data?.range 
      });
      
      const formattedData = eegService.formatAggregateForChart(data);
      console.log('Formatted data result:', { 
        hasFormattedData: !!formattedData,
        labelsCount: formattedData?.labels?.length 
      });
      
      // If formatting failed (returned null), use dummy data instead of crashing
      if (formattedData) {
        console.log('Using formatted backend data for', selectedTimeRange);
        setAggregateData(formattedData);
      } else {
        console.warn('Chart formatting failed, using dummy data for', selectedTimeRange);
        setAggregateData(null); // This will trigger dummy data usage in getCurrentData
      }
    } catch (error) {
      console.error('Error loading aggregate data:', error);
      // Use dummy data on error
      console.log('Setting aggregateData to null, will use dummy data');
      setAggregateData(null);
    } finally {
      setIsLoadingAggregate(false);
      console.log('loadAggregateData completed for range:', selectedTimeRange);
    }
  };

  // Dummy data for charts (fallback)
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

  const dailyData = {
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
    datasets: [
      {
        data: [1.2, 1.0, 2.3, 2.7, 2.1, 1.5],
        color: () => '#4287f5', // Focus color
        strokeWidth: 2
      },
      {
        data: [2.1, 1.8, 1.0, 1.2, 1.6, 2.0],
        color: () => '#FFA500', // Stress color
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

  // Convert backend recommendations to local format with default icons
  const getRecommendationIcon = (type: string, priority: string) => {
    if (type === 'focus') return 'target';
    if (type === 'stress') return 'meditation';
    if (priority === 'high') return 'alert-circle';
    return 'lightbulb-outline';
  };

  const recommendations = backendRecommendations.length > 0 
    ? backendRecommendations.map((rec, index) => ({
        id: typeof rec.id === 'number' ? rec.id : index + 1,
        title: rec.title,
        description: rec.description,
        icon: getRecommendationIcon(rec.type, rec.priority)
      }))
    : [
        {
          id: 1,
          title: "Morning Focus Boost",
          description: "Your focus peaks in the morning. Schedule important tasks before noon.",
          icon: "weather-sunny"
        },
        {
          id: 2,
          title: "Late-Night Gaming Alert!",
          description: "Gaming after 10PM correlated with 30% lower focus the next day.",
          icon: "gamepad-variant"
        },
        {
          id: 3,
          title: "Caffeine Optimization",
          description: "Two cups before noon shows optimal focus without stress increase.",
          icon: "coffee"
        },
        {
          id: 4,
          title: "Breathing Exercise",
          description: "Try 4-7-8 breathing when stress peaks in the afternoon.",
          icon: "lungs"
        }
      ];

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeSelector}>
      <TouchableOpacity 
        style={[styles.timeRangeButton, selectedTimeRange === 'daily' && styles.activeTimeRange]}
        onPress={() => setSelectedTimeRange('daily')}
      >
        <Text style={[styles.timeRangeText, selectedTimeRange === 'daily' && styles.activeTimeRangeText]}>Daily</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.timeRangeButton, selectedTimeRange === 'weekly' && styles.activeTimeRange]}
        onPress={() => setSelectedTimeRange('weekly')}
      >
        <Text style={[styles.timeRangeText, selectedTimeRange === 'weekly' && styles.activeTimeRangeText]}>Weekly</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.timeRangeButton, selectedTimeRange === 'monthly' && styles.activeTimeRange]}
        onPress={() => setSelectedTimeRange('monthly')}
      >
        <Text style={[styles.timeRangeText, selectedTimeRange === 'monthly' && styles.activeTimeRangeText]}>Monthly</Text>
      </TouchableOpacity>
    </View>
  );

  const getCurrentData = () => {
    // Use real aggregate data if available, otherwise fallback to dummy data
    if (aggregateData) {
      console.log('Using real aggregate data for chart, range:', selectedTimeRange);
      return {
        labels: aggregateData.labels,
        datasets: [
          {
            data: aggregateData.focusData,
            color: () => '#4287f5',
            strokeWidth: 2
          },
          {
            data: aggregateData.stressData,
            color: () => '#FFA500',
            strokeWidth: 2
          }
        ],
        legend: ["Focus", "Stress"]
      };
    }

    // Fallback to dummy data based on selected time range
    console.log('Using dummy data for chart, range:', selectedTimeRange);
    switch(selectedTimeRange) {
      case 'daily':
        return dailyData;
      case 'weekly':
        return weeklyData;
      case 'monthly':
        return monthlyData;
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
            {isLoadingAggregate ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading historical data...</Text>
              </View>
            ) : (
              <>
                {(() => {
                  try {
                    const chartData = getCurrentData();
                    if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
                      console.warn('Invalid chart data, using fallback');
                      return (
                        <View style={styles.loadingContainer}>
                          <Text style={styles.loadingText}>Chart data unavailable</Text>
                        </View>
                      );
                    }
                    
                    return (
                      <LineChart
                        data={chartData}
                        width={screenWidth - 40}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                      />
                    );
                  } catch (error) {
                    console.error('Chart rendering error:', error);
                    return (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Chart temporarily unavailable</Text>
                      </View>
                    );
                  }
                })()}
                <Text style={styles.chartCaption}>
                  {aggregateData 
                    ? `Real data (${aggregateData.totalSamples} samples)` 
                    : 'Sample data - connect to see your actual trends'
                  }
                </Text>
              </>
            )}
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
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#7a889e',
    fontSize: 16,
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