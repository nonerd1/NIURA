import React from 'react';
import { Dimensions, StyleSheet, View, Text, Pressable } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../theme/colors';

type Dataset = {
  data: number[];
  color: string;
  label: string;
};

type MetricsGraphProps = {
  labels: string[];
  datasets: Dataset[];
  lastUpdated?: string;
  status?: {
    level: string;
    value: number;
  };
  type: 'focus' | 'stress' | 'mental';
  onPress?: () => void;
  hideHeader?: boolean;
  yAxisMax?: number;
  yAxisSegments?: number;
  yAxisLabels?: number[];
};

const MetricsGraph = ({ labels, datasets, lastUpdated, status, type, onPress, hideHeader, yAxisMax = 3, yAxisSegments = 3, yAxisLabels = [0, 1, 2, 3] }: MetricsGraphProps) => {
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 16;
  const yAxisWidth = 35;
  const chartWidth = screenWidth - containerPadding - yAxisWidth;

  // Format time labels to 12-hour format and show every 2nd label for 2-hour gaps
  const formattedLabels = labels.map(label => {
    // Check if label is already formatted (contains AM/PM)
    if (label.includes('AM') || label.includes('PM')) {
      return label; // Already formatted, use as-is
    }
    
    // Handle time format like "14:00" or "2:00"
    const hour = parseInt(label.split(':')[0]);
    if (!isNaN(hour)) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}${ampm}`;
    }
    
    // For other formats (like day names), return as-is
    return label;
  });

  // Show only every 2nd label for 2-hour gaps (but show all labels if we have 4 or fewer)
  const displayLabels = labels.length <= 4 
    ? formattedLabels // Show all labels if 4 or fewer
    : formattedLabels.map((label, i) => i % 2 === 0 ? label : ''); // Show every 2nd label

  // Ensure we have valid data for each dataset
  const validDatasets = datasets.map(dataset => ({
    ...dataset,
    data: [
      // No hidden min/max points; use real 0-3 scale
      ...dataset.data.map(value => {
        if (isNaN(value) || !isFinite(value)) return 0;
        return value; // Use real 0-3 values for focus/stress
      })
    ]
  }));

  // Add a hidden dataset to force y-axis max
  const yAxisMaxDataset = {
    data: [yAxisMax],
    color: () => 'rgba(0,0,0,0)',
    strokeWidth: 0,
    withDots: false,
  };

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.lastUpdated}>Last updated {lastUpdated}</Text>
          </View>
          {status && (
            <View style={styles.headerRight}>
              <Text style={[styles.statusLevel, { color: datasets[0].color }]}>{status.level}</Text>
              <Text style={[styles.statusValue, { color: datasets[0].color }]}>
                {typeof status.value === 'number' ? status.value.toFixed(1) : '0.0'}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.chartWrapper}>
        <Pressable onPress={onPress} style={styles.chartContainer}>
          <LineChart
            data={{
              labels: displayLabels,
              datasets: [
                yAxisMaxDataset,
                ...validDatasets.map(dataset => ({
                  data: dataset.data.length > 0 ? dataset.data : [0],
                  color: () => dataset.color,
                  strokeWidth: 1.5,
                }))
              ]
            }}
            width={chartWidth}
            height={160}
            yAxisLabel=""
            yAxisSuffix=""
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
                r: '2',
                strokeWidth: '1',
              },
              propsForBackgroundLines: {
                stroke: 'rgba(255, 255, 255, 0.1)',
                strokeDasharray: '',
              },
              formatYLabel: (yLabel: string) => {
                const value = Number(yLabel);
                return yAxisLabels.includes(value) ? value.toString() : '';
              },
              count: yAxisSegments,
              propsForLabels: {
                fontSize: 11,
              }
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={true}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
            segments={yAxisSegments}
            withDots={true}
            withShadow={false}
            transparent={true}
            yLabelsOffset={10}
            xLabelsOffset={-5}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdated: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  statusLevel: {
    fontSize: 14,
    marginRight: 8,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartWrapper: {
    marginHorizontal: 0,
  },
  chartContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 16,
  },
});

export default MetricsGraph;
