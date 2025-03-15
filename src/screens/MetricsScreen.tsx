import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MetricsGraph from '../components/MetricsGraph';
import { colors } from '../theme/colors';

const Tab = createMaterialTopTabNavigator();

type MetricsData = {
  data: number[];
  labels: string[];
};

// Mock data generator - Replace this with real data from your backend
const generateMockData = (hours: number) => {
  const data: number[] = [];
  const labels: string[] = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const value = Number((Math.random() * 2 + 0.5).toFixed(1));
    data.push(value);
    // Format time with AM/PM indicator
    const hour = time.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    labels.push(`${hour12}${ampm}`);
  }
  
  return { data, labels };
};

const FocusTab = () => {
  const [focusData, setFocusData] = useState<MetricsData>({ data: [], labels: [] });

  useEffect(() => {
    const updateData = () => {
      const { data, labels } = generateMockData(6);
      setFocusData({ data, labels });
    };

    updateData();
    const interval = setInterval(updateData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate level based on current value
  const currentValue = focusData.data[focusData.data.length - 1] || 0;
  const level = currentValue <= 1 ? 'Low' : currentValue <= 2 ? 'Medium' : 'High';

  // Get current time for "Last updated"
  const now = new Date();
  const lastUpdated = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.title}>Focus Level</Text>
      <Text style={styles.subtitle}>Past 6 Hours</Text>
      <MetricsGraph
        labels={focusData.labels}
        datasets={[{
          data: focusData.data,
          color: colors.primary.main,
          label: 'Focus'
        }]}
        type="focus"
        lastUpdated={lastUpdated}
        status={{
          level,
          value: currentValue
        }}
      />
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {focusData.data.length > 0 ? Math.max(...focusData.data).toFixed(1) : '0.0'}
          </Text>
          <Text style={styles.statLabel}>Peak Focus</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {focusData.data.length > 0 
              ? (focusData.data.reduce((a, b) => a + b, 0) / focusData.data.length).toFixed(1)
              : '0.0'}
          </Text>
          <Text style={styles.statLabel}>Average Focus</Text>
        </View>
      </View>
    </View>
  );
};

const StressTab = () => {
  const [stressData, setStressData] = useState<MetricsData>({ data: [], labels: [] });

  useEffect(() => {
    const updateData = () => {
      const { data, labels } = generateMockData(6);
      setStressData({ data, labels });
    };

    updateData();
    const interval = setInterval(updateData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate level based on current value
  const currentValue = stressData.data[stressData.data.length - 1] || 0;
  const level = currentValue <= 1 ? 'Low' : currentValue <= 2 ? 'Medium' : 'High';

  // Get current time for "Last updated"
  const now = new Date();
  const lastUpdated = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.title}>Stress Level</Text>
      <Text style={styles.subtitle}>Past 6 Hours</Text>
      <MetricsGraph
        labels={stressData.labels}
        datasets={[{
          data: stressData.data,
          color: colors.error,
          label: 'Stress'
        }]}
        type="stress"
        lastUpdated={lastUpdated}
        status={{
          level,
          value: currentValue
        }}
      />
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {stressData.data.length > 0 ? Math.max(...stressData.data).toFixed(1) : '0.0'}
          </Text>
          <Text style={styles.statLabel}>Peak Stress</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {stressData.data.length > 0 
              ? (stressData.data.reduce((a, b) => a + b, 0) / stressData.data.length).toFixed(1)
              : '0.0'}
          </Text>
          <Text style={styles.statLabel}>Average Stress</Text>
        </View>
      </View>
    </View>
  );
};

const MetricsScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary.main,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.secondary,
      }}
    >
      <Tab.Screen name="Focus" component={FocusTab} />
      <Tab.Screen name="Stress" component={StressTab} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background.dark,
  },
  tabBar: {
    backgroundColor: colors.background.dark,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
});

export default MetricsScreen; 