import React from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

type DetailedMetricsScreenProps = {
  route: RouteProp<RootStackParamList, 'DetailedMetrics'>;
};

type DetailedMetricsRouteParams = {
  focusData: number[];
  stressData: number[];
  labels: string[];
  lastUpdated: string;
  focusLevel: string;
  focusValue: number;
  stressLevel: string;
  stressValue: number;
  focusColor: string;
  stressColor: string;
};

const DetailedMetricsScreen = ({ route }: DetailedMetricsScreenProps) => {
  const { 
    focusData, 
    stressData, 
    labels, 
    focusColor, 
    stressColor, 
    lastUpdated,
    focusValue,
    stressValue,
    focusLevel,
    stressLevel
  } = route.params;
  const navigation = useNavigation();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 96;

  const renderChart = (data: number[] | undefined, color: string, title: string, value: number | undefined, level: string) => {
    // Ensure data is an array and has values
    const safeData = Array.isArray(data) && data.length > 0 
      ? data.map(val => Number(Math.max(0, Math.min(3, val)).toFixed(1)))
      : [0];
    const safeValue = typeof value === 'number' ? Number(Math.max(0, Math.min(3, value)).toFixed(1)) : 0;
    
    // Format time labels to 12-hour format
    const formattedLabels = labels.map(label => {
      const hour = parseInt(label.split(':')[0]);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}${ampm}`;
    });

    // Calculate statistics
    const average = Number((safeData.reduce((a, b) => a + b, 0) / safeData.length).toFixed(1));
    const peak = Number(Math.max(...safeData).toFixed(1));
    const lowest = Number(Math.min(...safeData).toFixed(1));

    // Create data with reference point to ensure Y axis goes to 3
    const chartData = {
      labels: formattedLabels,
      datasets: [
        {
          data: safeData,
          color: () => color,
          strokeWidth: 2,
        },
        {
          // Hidden dataset with just a point at 3.0 to force y-axis scale
          data: [3],
          color: () => 'transparent',
          strokeWidth: 0,
          withDots: false,
        }
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{title}</Text>
          <View style={styles.levelContainer}>
            <Text style={[styles.levelText, { color }]}>{level}</Text>
            <Text style={[styles.valueText, { color }]}>{safeValue.toFixed(1)}</Text>
          </View>
        </View>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: colors.background.dark,
            backgroundGradientFrom: colors.background.dark,
            backgroundGradientTo: colors.background.dark,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: () => colors.text.secondary,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: color,
            },
            propsForBackgroundLines: {
              stroke: 'rgba(255, 255, 255, 0.1)',
              strokeDasharray: '5,5',
            },
            propsForVerticalLabels: {
              fontSize: 10,
              rotation: 0,
            },
            formatYLabel: (yLabel: string) => {
              const value = Number(yLabel);
              return value.toFixed(1);
            },
          }}
          bezier
          style={{
            ...styles.chart,
            alignSelf: 'center',
          }}
          withDots={true}
          withShadow={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={true}
          yAxisInterval={1}
          yAxisSuffix=""
          yAxisLabel=""
          segments={4}
          yMax={3}
        />
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={[styles.statValue, { color }]}>{average.toFixed(1)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Peak</Text>
            <Text style={[styles.statValue, { color }]}>{peak.toFixed(1)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lowest</Text>
            <Text style={[styles.statValue, { color }]}>{lowest.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Detailed Metrics</Text>
        <Text style={styles.lastUpdated}>Last updated {lastUpdated}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderChart(focusData, focusColor, 'Focus Metrics', focusValue, focusLevel)}
        {renderChart(stressData, stressColor, 'Stress Metrics', stressValue, stressLevel)}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: colors.text.primary,
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  chartContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DetailedMetricsScreen; 