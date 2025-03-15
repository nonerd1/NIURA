import React from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

type MentalReadinessDetailsScreenProps = {
  route: RouteProp<RootStackParamList, 'MentalReadinessDetails'>;
};

const MentalReadinessDetailsScreen = ({ route }: MentalReadinessDetailsScreenProps) => {
  const { data, labels: receivedLabels, color, lastUpdated, score, level } = route.params;
  const navigation = useNavigation();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 96;

  // Override the received time labels with weekday labels
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // Reorder weekdays to end with today
  const orderedDays = [...weekDays.slice(today), ...weekDays.slice(0, today)].slice(-7);

  // Ensure data is valid and format it
  const safeData = Array.isArray(data) && data.length > 0 
    ? data.map(val => Number(Math.max(0, Math.min(100, val)).toFixed(1)))
    : [0];

  // Calculate statistics
  const average = Number((safeData.reduce((a, b) => a + b, 0) / safeData.length).toFixed(1));
  const peak = Number(Math.max(...safeData).toFixed(1));
  const lowest = Number(Math.min(...safeData).toFixed(1));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Mental Readiness</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Readiness combines your Focus and Stress levels to gauge your mental state.
          </Text>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Overview</Text>
            <View style={styles.levelContainer}>
              <Text style={[styles.levelText, { color }]}>{level}</Text>
              <Text style={[styles.valueText, { color }]}>{score}%</Text>
            </View>
          </View>

          <LineChart
            data={{
              labels: orderedDays,
              datasets: [{
                data: safeData,
                color: () => color,
                strokeWidth: 2,
              }],
            }}
            width={chartWidth}
            height={220}
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
                r: '3',
                strokeWidth: '2',
                stroke: color,
              },
              propsForBackgroundLines: {
                stroke: 'rgba(255, 255, 255, 0.05)',
              },
              formatYLabel: (yLabel: string) => {
                const value = Number(yLabel);
                return value % 20 === 0 ? `${value}%` : '';
              },
            }}
            bezier
            style={{
              ...styles.chart,
              alignSelf: 'center',
            }}
            segments={6}
            withDots={true}
            withShadow={false}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            fromZero={true}
            transparent={true}
            yLabelsOffset={10}
            xLabelsOffset={-5}
          />

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color }]}>{average}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Peak</Text>
              <Text style={[styles.statValue, { color }]}>{peak}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lowest</Text>
              <Text style={[styles.statValue, { color }]}>{lowest}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.insightContainer}>
          <Text style={styles.insightTitle}>Weekly Insights</Text>
          <Text style={styles.insightText}>
            Your mental readiness score has been {level.toLowerCase()} this week, averaging {average}%. 
            You reached your peak of {peak}% and maintained a healthy baseline above {lowest}%.
          </Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  descriptionContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
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
  insightContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default MentalReadinessDetailsScreen; 