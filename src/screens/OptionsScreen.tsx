import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  children: React.ReactNode;
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

const OptionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    hapticFeedback: true,
    autoConnect: true,
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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

  const userProfile = {
    name: 'Pari Patel',
    email: 'pari@niura.io',
    thresholds: {
      focus: 'High (2.6)',
      stress: 'Low (1.2)'
    }
  };
  
  const deviceInfo = {
    name: 'Niura Alpha Earbuds',
    firmware: 'v1.2.4',
    battery: '78%',
    lastSync: '10 minutes ago'
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
      <View style={{ flex: 1, backgroundColor: colors.background.dark }}>
        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text.primary,
          }}>Options</Text>
        </View>
        
        <ScrollView 
          style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile & Preferences */}
          <SettingsSection title="User Profile & Preferences" icon="account-cog">
            <SettingsItem
              title="Profile Information"
              description={`${userProfile.name} • ${userProfile.email}`}
              onPress={() => {/* Navigate to profile edit screen */}}
            />
            <SettingsItem
              title="Focus Alert Threshold"
              description={userProfile.thresholds.focus}
              onPress={() => {/* Navigate to threshold settings */}}
            />
            <SettingsItem
              title="Stress Alert Threshold"
              description={userProfile.thresholds.stress}
              onPress={() => {/* Navigate to threshold settings */}}
            />
            <SettingsItem
              title="Notifications"
              rightElement={
                <Switch
                  value={settings.notifications}
                  onValueChange={() => toggleSetting('notifications')}
                  trackColor={{ false: '#313e5c', true: '#4287f5' }}
                  thumbColor={settings.notifications ? '#FFFFFF' : '#7a889e'}
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
                  value={settings.darkMode}
                  onValueChange={() => toggleSetting('darkMode')}
                  trackColor={{ false: '#313e5c', true: '#4287f5' }}
                  thumbColor={settings.darkMode ? '#FFFFFF' : '#7a889e'}
                />
              }
              showChevron={false}
            />
            <SettingsItem
              title="Text Size"
              description="Medium"
              onPress={() => {/* Navigate to text size settings */}}
              isLast={true}
            />
          </SettingsSection>
          
          {/* Help & Support */}
          <SettingsSection title="Help & Support" icon="help-circle">
            <SettingsItem
              title="Frequently Asked Questions"
              onPress={() => {/* Navigate to FAQs */}}
            />
            <SettingsItem
              title="Contact Support"
              description="Get help with any issues"
              onPress={() => {/* Navigate to support */}}
            />
            <SettingsItem
              title="Therapy Jokes"
              description="Because laughter is the best medicine"
              onPress={() => navigation.navigate('TherapyJokes')}
            />
            <SettingsItem
              title="About Niura"
              onPress={() => {/* Show about info */}}
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
});

export default OptionsScreen; 