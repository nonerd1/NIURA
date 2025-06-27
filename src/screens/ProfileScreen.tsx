import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { authService, User } from '../services/auth';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Interface for profile statistics
interface ProfileStats {
  sessions: number;
  focus_time: string;
  avg_score: string;
}

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Debug: Check if we have auth token, if not, set it
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ No auth token found, setting debug token...');
        const debugToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUwODkxMDA2fQ.e9H-FmCCs7EBr50LnBwWNIIeefZYJxG9Z7MHOE4ag8U';
        await AsyncStorage.setItem('authToken', debugToken);
        console.log('✅ Debug token set');
      }
      
      // Load user profile and stats in parallel
      const [currentUser, userProfile, userStats] = await Promise.all([
        authService.getCurrentUser(),
        authService.getUserProfile().catch(error => {
          console.warn('Failed to fetch user profile:', error);
          return null;
        }),
        authService.getUserProfileStats().catch(error => {
          console.warn('Failed to fetch user stats:', error);
          return null;
        })
      ]);

      setUser(currentUser);
      setProfileStats(userStats);
      
      console.log('✅ Profile data loaded:', {
        user: currentUser,
        profile: userProfile,
        stats: userStats
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              navigation.replace('Login');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const displayEmail = user?.email || 'testica@example.com';

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
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <MaterialCommunityIcons 
                name="account-circle" 
                size={100} 
                color={colors.primary.main} 
                style={styles.profileIcon}
              />
            </View>
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 16 }} />
            ) : (
              <>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userEmail}>{displayEmail}</Text>
              </>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <>
                  <Text style={styles.statValue}>{profileStats?.sessions || 0}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </>
              )}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <>
                  <Text style={styles.statValue}>{profileStats?.focus_time || '0m'}</Text>
                  <Text style={styles.statLabel}>Focus Time</Text>
                </>
              )}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <>
                  <Text style={styles.statValue}>{profileStats?.avg_score || '0%'}</Text>
                  <Text style={styles.statLabel}>Avg. Score</Text>
                </>
              )}
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <Pressable style={styles.menuItem} onPress={handleEditProfile}>
              <MaterialCommunityIcons name="account-edit" size={24} color={colors.text.primary} />
              <Text style={styles.menuText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
            </Pressable>
            
            <Pressable style={styles.menuItem}>
              <MaterialCommunityIcons name="bell" size={24} color={colors.text.primary} />
              <Text style={styles.menuText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
            </Pressable>

            <Pressable style={styles.menuItem}>
              <MaterialCommunityIcons name="cog" size={24} color={colors.text.primary} />
              <Text style={styles.menuText}>Settings</Text>
              <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
            </Pressable>

            <Pressable style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>Log Out</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 24,
    padding: 20,
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.text.secondary,
    opacity: 0.2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  menuContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  logoutButton: {
    marginTop: 8,
  },
  profileImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 135, 245, 0.1)',
    overflow: 'hidden',
  },
  profileIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
    margin: 0,
    padding: 0,
  },
});

export default ProfileScreen; 