import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import RNSpeedometer from 'react-native-speedometer';
import { colors } from '../theme/colors';
import { useDemo } from '../context/DemoContext';

type SpeedometerMetricsProps = {
  focusValue: number;
  stressValue: number;
  containerStyle?: object;
};

const SpeedometerMetrics = ({ focusValue, stressValue, containerStyle }: SpeedometerMetricsProps) => {
  const { demoMode, focusValue: demoFocusValue, stressValue: demoStressValue } = useDemo();

  // Use demo values when in demo mode
  const displayFocusValue = demoMode ? demoFocusValue : focusValue;
  const displayStressValue = demoMode ? demoStressValue : stressValue;

  // Convert 0-3 scale to 0-100 scale
  // Add a tiny buffer (0.01) to avoid edge cases at segment boundaries
  const focusPercentage = Math.min(100, ((displayFocusValue / 3) * 100) + 0.01);
  const stressPercentage = Math.min(100, ((displayStressValue / 3) * 100) + 0.01);

  // Adjust segment boundaries slightly to prevent rendering gaps
  const focusLabels = [
    {
      name: 'Low',
      labelColor: '#FF4B4B',
      activeBarColor: '#FF4B4B',
      value: 32.5, // Slightly adjusted from 33
      labelStyle: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }
    },
    {
      name: 'Medium',
      labelColor: '#FFD93D',
      activeBarColor: '#FFD93D',
      value: 65.5, // Slightly adjusted from 66
      labelStyle: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }
    },
    {
      name: 'High',
      labelColor: '#4BFF4B',
      activeBarColor: '#4BFF4B',
      value: 100,
      labelStyle: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }
    }
  ];

  const stressLabels = [
    {
      name: 'Low',
      labelColor: '#4BFF4B',
      activeBarColor: '#4BFF4B',
      value: 32.5, // Slightly adjusted from 33
      labelStyle: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }
    },
    {
      name: 'Medium',
      labelColor: '#FFD93D',
      activeBarColor: '#FFD93D',
      value: 65.5, // Slightly adjusted from 66
      labelStyle: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }
    },
    {
      name: 'High',
      labelColor: '#FF4B4B',
      activeBarColor: '#FF4B4B',
      value: 100,
      labelStyle: {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }
    }
  ];

  // Helper function to get level text
  const getLevel = (value: number) => {
    if (value < 1) return 'Low';
    if (value < 2) return 'Medium';
    return 'High';
  };

  // Add logging when values change
  useEffect(() => {
    console.log(`SpeedometerMetrics received - Focus: ${focusValue}, Stress: ${stressValue}`);
  }, [focusValue, stressValue]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.metricsContainer}>
        <View style={styles.speedometerContainer}>
          <RNSpeedometer
            value={focusPercentage}
            size={120}
            minValue={0}
            maxValue={100}
            labels={focusLabels}
            labelNoteStyle={{
              display: 'none',
              opacity: 0,
              height: 0,
              width: 0,
              position: 'absolute',
              color: 'transparent',
            }}
            labelStyle={{
              display: 'none',
              opacity: 0,
              height: 0,
              width: 0,
              position: 'absolute',
              color: 'transparent',
            }}
            innerCircleStyle={{
              ...styles.innerCircleStyle,
              backgroundColor: colors.background.card,
            }}
          />
          <View style={styles.labelContainer}>
            <Text style={styles.metricValue}>{displayFocusValue.toFixed(1)}</Text>
            <Text style={[
              styles.metricLevel,
              displayFocusValue < 1 ? styles.lowColor : 
              displayFocusValue < 2 ? styles.mediumColor : 
              styles.highColor,
              { textShadowColor: 'transparent', textShadowRadius: 0, textShadowOffset: { width: 0, height: 0 } }
            ]}>{getLevel(displayFocusValue)}</Text>
            <Text style={styles.metricLabel}>FOCUS</Text>
          </View>
        </View>

        <View style={styles.speedometerContainer}>
          <RNSpeedometer
            value={stressPercentage}
            size={120}
            minValue={0}
            maxValue={100}
            labels={stressLabels}
            labelNoteStyle={{
              display: 'none',
              opacity: 0,
              height: 0,
              width: 0,
              position: 'absolute',
              color: 'transparent',
            }}
            labelStyle={{
              display: 'none',
              opacity: 0,
              height: 0,
              width: 0,
              position: 'absolute',
              color: 'transparent',
            }}
            innerCircleStyle={{
              ...styles.innerCircleStyle,
              backgroundColor: colors.background.card,
            }}
          />
          <View style={styles.labelContainer}>
            <Text style={styles.metricValue}>{displayStressValue.toFixed(1)}</Text>
            <Text style={[
              styles.metricLevel,
              displayStressValue < 1 ? styles.highColor : 
              displayStressValue < 2 ? styles.mediumColor : 
              styles.lowColor,
              { textShadowColor: 'transparent', textShadowRadius: 0, textShadowOffset: { width: 0, height: 0 } }
            ]}>{getLevel(displayStressValue)}</Text>
            <Text style={styles.metricLabel}>STRESS</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  speedometerContainer: {
    alignItems: 'center',
    width: '38%',
    maxWidth: 130,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricLevel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  labelNoteStyle: {
    display: 'none',
    opacity: 0,
    height: 0,
    width: 0,
    position: 'absolute',
  },
  innerCircleStyle: {
    backgroundColor: colors.background.card,
  },
  lowColor: {
    color: '#FF4B4B',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  mediumColor: {
    color: '#FFD93D',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  highColor: {
    color: '#4BFF4B',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
});

export default SpeedometerMetrics;