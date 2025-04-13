import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

const BluetoothScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Bluetooth Devices</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Connection Status */}
          <View style={styles.statusCard}>
            <MaterialCommunityIcons 
              name="headphones" 
              size={48} 
              color={colors.primary.main} 
            />
            <Text style={styles.deviceName}>NIURA Earbuds</Text>
            <Text style={styles.statusText}>Not Connected</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to connect:</Text>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Open your device's Bluetooth settings
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Place your earbuds in pairing mode
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Select "NIURA Earbuds" from the list of available devices
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  instructionsContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default BluetoothScreen; 