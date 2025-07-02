import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth';
import { notificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  children: React.ReactNode;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  gender: string;
  created_at: string;
}

interface UserPreferences {
  focus_alert_threshold: number;
  stress_alert_threshold: number;
  notifications_enabled: boolean;
  dark_mode_enabled: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon, children }) => {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.background.card,
      borderRadius: 16,
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#313e5c',
      }}>
        <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary.main} />
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text.primary,
          marginLeft: 10,
        }}>{title}</Text>
      </View>
      <View style={{ paddingTop: 8, paddingBottom: 8 }}>
        {children}
      </View>
    </View>
  );
};

interface SettingsItemProps {
  title: string;
  description?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  title, 
  description, 
  rightElement, 
  onPress, 
  showChevron = true,
  isLast = false
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity 
      style={[
        { paddingHorizontal: 16, paddingVertical: 14 },
        !isLast && { borderBottomWidth: 1, borderBottomColor: '#313e5c' }
      ]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '500',
            color: colors.text.primary,
            marginBottom: 4,
          }}>{title}</Text>
          {description && (
            <Text style={{
              fontSize: 14,
              color: colors.text.secondary,
            }}>{description}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {rightElement}
          {showChevron && onPress && (
            <MaterialCommunityIcons name="chevron-right" size={24} color="#7a889e" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ThresholdModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  currentValue: number;
  onSave: (value: number) => void;
  type: 'focus' | 'stress';
}> = ({ visible, onClose, title, currentValue, onSave, type }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  const getValueLabel = (val: number) => {
    if (val < 1.0) return 'Low';
    if (val < 2.0) return 'Medium';
    return 'High';
  };

  const getValueDescription = (val: number) => {
    if (type === 'focus') {
      if (val < 1.0) return 'Rarely alert for low focus periods';
      if (val < 2.0) return 'Alert when focus drops to moderate levels';
      return 'Alert immediately when focus begins to decline';
    } else {
      if (val < 1.0) return 'Only alert for severe stress levels';
      if (val < 2.0) return 'Alert when stress reaches moderate levels';
      return 'Alert for any stress level increase';
    }
  };

  const presetValues = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.primary.main, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>{title}</Text>
            <TouchableOpacity onPress={() => { onSave(value); onClose(); }}>
              <Text style={{ color: colors.primary.main, fontSize: 16, fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ backgroundColor: colors.background.card, borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>
              {getValueLabel(value)} ({value.toFixed(1)})
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
              {getValueDescription(value)}
            </Text>
          </View>
          
          <View style={{ backgroundColor: colors.background.card, borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 16 }}>
              Select Threshold Level
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {presetValues.map((presetValue) => (
                <TouchableOpacity
                  key={presetValue}
                  style={{
                    width: '30%',
                    backgroundColor: value === presetValue ? colors.primary.main : colors.background.dark,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: value === presetValue ? colors.primary.main : '#313e5c',
                  }}
                  onPress={() => setValue(presetValue)}
                >
                  <Text style={{ 
                    color: value === presetValue ? '#FFFFFF' : colors.text.primary, 
                    fontSize: 16, 
                    fontWeight: 'bold' 
                  }}>
                    {presetValue.toFixed(1)}
                  </Text>
                  <Text style={{ 
                    color: value === presetValue ? '#FFFFFF' : colors.text.secondary, 
                    fontSize: 12, 
                    marginTop: 4 
                  }}>
                    {getValueLabel(presetValue)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 10 }}>
                Or enter custom value (0.5 - 3.0):
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.background.dark,
                  borderRadius: 8,
                  padding: 12,
                  color: colors.text.primary,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: '#313e5c',
                }}
                value={value.toString()}
                onChangeText={(text) => {
                  const numValue = parseFloat(text);
                  if (!isNaN(numValue) && numValue >= 0.5 && numValue <= 3.0) {
                    setValue(numValue);
                  }
                }}
                keyboardType="numeric"
                placeholder="Enter value"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const OptionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isDarkMode, toggleTheme, colors, updateFromBackendPreferences } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState<'focus' | 'stress' | null>(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<boolean | null>(null);

  useEffect(() => {
    loadUserData();
    checkNotificationPermissions();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [profile, preferences] = await Promise.all([
        authService.getUserProfile(),
        authService.getUserPreferences()
      ]);
      setUserProfile(profile);
      setUserPreferences(preferences);
      
      // Sync theme with backend preferences
      await updateFromBackendPreferences(preferences);
    } catch (error: any) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkNotificationPermissions = async () => {
    try {
      const hasPermission = await notificationService.checkPermissions();
      setNotificationPermissionStatus(hasPermission);
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const handlePreferenceUpdate = async (updates: Partial<UserPreferences>) => {
    try {
      if (!userPreferences) return;
      
      const updatedPreferences = { ...userPreferences, ...updates };
      setUserPreferences(updatedPreferences);
      
      await authService.updateUserPreferences(updates);
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update preferences. Please try again.');
      
      // Revert local state on error
      setUserPreferences(userPreferences);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && notificationPermissionStatus === false) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive focus and stress alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {/* Open settings if possible */} }
        ]
      );
      return;
    }

    try {
      await handlePreferenceUpdate({ notifications_enabled: enabled });
      
      if (enabled) {
        await notificationService.requestPermissions();
        const hasPermission = await notificationService.checkPermissions();
        setNotificationPermissionStatus(hasPermission);
      }
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingAccount(true);
              await authService.deleteUserAccount();
              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.replace('Login'),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const getThresholdLabel = (value: number) => {
    if (value < 1.0) return 'Low';
    if (value < 2.0) return 'Medium';
    return 'High';
  };

  const handleDarkModeToggle = async (value: boolean) => {
    // Update local theme immediately
    if (value !== isDarkMode) {
      await toggleTheme();
    }
    
    // Also update server preferences
    handlePreferenceUpdate({ dark_mode_enabled: value });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={{ color: colors.text.secondary, marginTop: 16 }}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
      <View style={{ flex: 1, backgroundColor: colors.background.dark }}>
        <View style={styles.header}>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <Text style={[styles.screenTitle, { textAlign: 'center', width: '100%' }]}>Options</Text>
          </View>
        </View>
        
        <ScrollView 
          style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile & Preferences */}
          <SettingsSection title="User Profile & Preferences" icon="account-cog">
            <SettingsItem
              title="Profile Information"
              description={userProfile ? `${userProfile.full_name} • ${userProfile.email}` : 'Loading...'}
              onPress={() => navigation.navigate('EditProfile')}
            />
            <SettingsItem
              title="Focus Alert Threshold"
              description={userPreferences ? `${getThresholdLabel(userPreferences.focus_alert_threshold)} (${userPreferences.focus_alert_threshold.toFixed(1)})` : 'Loading...'}
              onPress={() => setShowThresholdModal('focus')}
            />
            <SettingsItem
              title="Stress Alert Threshold"
              description={userPreferences ? `${getThresholdLabel(userPreferences.stress_alert_threshold)} (${userPreferences.stress_alert_threshold.toFixed(1)})` : 'Loading...'}
              onPress={() => setShowThresholdModal('stress')}
            />
            <SettingsItem
              title="Notifications"
              description={notificationPermissionStatus === false ? 'Permission required' : undefined}
              rightElement={
                <Switch
                  value={userPreferences?.notifications_enabled || false}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: '#313e5c', true: '#4287f5' }}
                  thumbColor={userPreferences?.notifications_enabled ? '#FFFFFF' : '#7a889e'}
                />
              }
              showChevron={false}
              isLast={true}
            />
          </SettingsSection>
          
          {/* App Appearance */}
          <SettingsSection title="App Appearance" icon="palette">
            <SettingsItem
              title="Dark Mode"
              rightElement={
                <Switch
                  value={isDarkMode}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: '#313e5c', true: '#4287f5' }}
                  thumbColor={isDarkMode ? '#FFFFFF' : '#7a889e'}
                />
              }
              showChevron={false}
              isLast={true}
            />
          </SettingsSection>
          
          {/* Help & Support */}
          <SettingsSection title="Help & Support" icon="help-circle">
            <SettingsItem
              title="Frequently Asked Questions"
              onPress={() => Linking.openURL('https://niura.io/#FAQ')}
            />
            <SettingsItem
              title="Contact Support"
              description="Get help with any issues"
              onPress={() => Linking.openURL('https://niura.io/contact')}
            />
            <SettingsItem
              title="Therapy Jokes"
              description="Because laughter is the best medicine"
              onPress={() => navigation.navigate('TherapyJokes')}
            />
            <SettingsItem
              title="About Niura"
              onPress={() => Linking.openURL('https://niura.io')}
              isLast={true}
            />
          </SettingsSection>

          {/* Dangerous Actions */}
          <SettingsSection title="Dangerous Actions" icon="alert-circle">
            <SettingsItem
              title="Delete Account"
              description="Permanently delete your account and all data"
              rightElement={
                isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#ff4444" />
                ) : (
                  <MaterialCommunityIcons name="delete" size={20} color="#ff4444" />
                )
              }
              onPress={isDeletingAccount ? undefined : handleDeleteAccount}
              showChevron={false}
              isLast={true}
            />
          </SettingsSection>

          {/* Debug & Testing Section (only in development) */}
          {__DEV__ && (
            <SettingsSection title="Debug & Testing" icon="bug">
              <SettingsItem
                title="Test Focus Alert"
                description="Trigger a focus alert notification"
                rightElement={<MaterialCommunityIcons name="brain" size={20} color="#ffa500" />}
                onPress={async () => {
                  try {
                    // Simulate focus dropping below threshold
                    await notificationService.checkThresholdAlerts(1.0, 2.0); // Low focus, normal stress
                    Alert.alert('Debug', 'Focus alert test triggered (if threshold allows)');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to test focus alert');
                  }
                }}
                showChevron={false}
              />
              <SettingsItem
                title="Test Stress Alert"
                description="Trigger a stress alert notification"
                rightElement={<MaterialCommunityIcons name="heart-pulse" size={20} color="#ff6b6b" />}
                onPress={async () => {
                  try {
                    // Simulate stress exceeding threshold
                    await notificationService.checkThresholdAlerts(2.5, 2.8); // Good focus, high stress
                    Alert.alert('Debug', 'Stress alert test triggered (if threshold allows)');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to test stress alert');
                  }
                }}
                showChevron={false}
              />
              <SettingsItem
                title="Reset Alert States"
                description="Clear notification throttling states"
                rightElement={<MaterialCommunityIcons name="refresh" size={20} color="#4287f5" />}
                onPress={() => {
                  notificationService.resetAlertStates();
                  Alert.alert('Debug', 'Alert states reset - notifications will trigger again');
                }}
                showChevron={false}
              />
              <SettingsItem
                title="View Alert States"
                description="Show current notification throttling status"
                rightElement={<MaterialCommunityIcons name="information" size={20} color="#17a2b8" />}
                onPress={() => {
                  const states = notificationService.getAlertStates();
                  Alert.alert('Alert States', 
                    `Focus Alert Sent: ${states.focusAlertSent}\n` +
                    `Stress Alert Sent: ${states.stressAlertSent}\n` +
                    `Last Focus: ${states.lastFocusValue.toFixed(1)}\n` +
                    `Last Stress: ${states.lastStressValue.toFixed(1)}`
                  );
                }}
                showChevron={false}
                isLast={true}
              />
            </SettingsSection>
          )}
          
          <View style={{
            alignItems: 'center',
            marginVertical: 20,
          }}>
            <Text style={{
              fontSize: 14,
              color: colors.text.secondary,
            }}>Version 1.0.0 (Alpha)</Text>
          </View>
        </ScrollView>
      </View>

      {/* Threshold Configuration Modals */}
      {showThresholdModal && userPreferences && (
        <ThresholdModal
          visible={true}
          onClose={() => setShowThresholdModal(null)}
          title={`${showThresholdModal === 'focus' ? 'Focus' : 'Stress'} Alert Threshold`}
          currentValue={showThresholdModal === 'focus' ? userPreferences.focus_alert_threshold : userPreferences.stress_alert_threshold}
          onSave={(value) => {
            handlePreferenceUpdate({
              [showThresholdModal === 'focus' ? 'focus_alert_threshold' : 'stress_alert_threshold']: value
            });
          }}
          type={showThresholdModal}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default OptionsScreen; 