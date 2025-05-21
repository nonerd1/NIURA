import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { databaseService } from '../services/database';

interface MetricsData {
  date: string;
  stressLevel: number;
  attentionLevel: number;
}

interface DailyMetrics extends MetricsData {
  count: number;
}

const MetricsScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setError(null);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const readings = await databaseService.getReadings(startDate, endDate);
      
      // Group readings by date and calculate averages
      const dailyMetrics = readings.reduce((acc: { [key: string]: DailyMetrics }, reading) => {
        if (!reading.timestamp) return acc;
        
        const date = new Date(reading.timestamp).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            stressLevel: 0,
            attentionLevel: 0,
            count: 0
          };
        }
        
        const value = Number(reading.value) || 0;
        if (reading.type === 'stress') {
          acc[date].stressLevel += value;
        } else if (reading.type === 'attention') {
          acc[date].attentionLevel += value;
        }
        acc[date].count++;
        
        return acc;
      }, {});

      // Calculate averages and format data
      const formattedMetrics = Object.values(dailyMetrics)
        .map(metric => ({
          date: metric.date,
          stressLevel: metric.count > 0 ? metric.stressLevel / metric.count : 0,
          attentionLevel: metric.count > 0 ? metric.attentionLevel / metric.count : 0
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMetrics(formattedMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setError('Failed to load metrics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (metrics.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No metrics data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {metrics.map((metric, index) => (
        <View key={metric.date} style={styles.metricItem}>
          <Text style={styles.date}>{new Date(metric.date).toLocaleDateString()}</Text>
          <Text style={styles.metricText}>
            Stress Level: {metric.stressLevel.toFixed(2)}
          </Text>
          <Text style={styles.metricText}>
            Attention Level: {metric.attentionLevel.toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  metricItem: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  metricText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default MetricsScreen; 