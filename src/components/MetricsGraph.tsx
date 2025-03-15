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
  type: 'focus' | 'stress';
  onPress?: () => void;
};

const MetricsGraph = ({ labels, datasets, lastUpdated, status, type, onPress }: MetricsGraphProps) => {
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = 16;
  const yAxisWidth = 35;
  const chartWidth = screenWidth - containerPadding - yAxisWidth;

  // Format time labels to 12-hour format and show every 2nd label for 2-hour gaps
  const formattedLabels = labels.map(label => {
    const hour = parseInt(label.split(':')[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
  });

  // Show only every 2nd label for 2-hour gaps
  const displayLabels = formattedLabels.map((label, i) => 
    i % 2 === 0 ? label : ''
  );

  // Ensure we have valid data for each dataset
  const validDatasets = datasets.map(dataset => ({
    ...dataset,
    data: [
      0, // Hidden minimum reference point
      ...dataset.data.map(value => {
        if (isNaN(value) || !isFinite(value)) return 0;
        // Scale the value to 0-99 range if it's mental readiness data
        if (dataset.label.toLowerCase().includes('mental')) {
          return value; // Mental readiness is already in 0-99 range
        }
        // Scale focus/stress from 0-3 to 0-99
        return Math.round((value / 3) * 99);
      }),
      99, // Hidden maximum reference point
    ]
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.lastUpdated}>Last updated {lastUpdated}</Text>
        </View>
        {status && (
          <View style={styles.headerRight}>
            <Text style={[styles.statusLevel, { color: datasets[0].color }]}>{status.level}</Text>
            <Text style={[styles.statusValue, { color: datasets[0].color }]}>{status.value.toFixed(1)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chartWrapper}>
        <Pressable onPress={onPress} style={styles.chartContainer}>
          <LineChart
            data={{
              labels: displayLabels,
              datasets: [
                // Reference dataset to force y-axis range (invisible)
                {
                  data: [0, 99],
                  color: () => 'rgba(0, 0, 0, 0)',
                  strokeWidth: 0,
                },
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
              decimalPlaces: 0,
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
                // Show labels at 0, 33, 66, 99
                return value % 33 === 0 ? value.toString() : '';
              },
              count: 4,
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
            segments={3}
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
