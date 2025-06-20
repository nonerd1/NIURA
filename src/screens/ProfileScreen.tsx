import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useDemo } from '../context/DemoContext';
import { authService, User } from '../services/auth';
import { RootStackParamList } from '../types/navigation';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { demoMode, startDemo } = useDemo();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDemo = () => {
    console.log('Starting demo mode from profile screen');
    startDemo();
    navigation.goBack();
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

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Pari Patel';
  const displayEmail = user?.email || 'pari@niura.io';

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
            <Pressable 
              onPress={handleStartDemo} 
              style={({ pressed }) => [
                styles.profileImageContainer,
                !demoMode ? styles.profileImageOuterCircle : null,
                pressed && styles.profilePressed,
              ]}
            >
              <MaterialCommunityIcons 
                name="account-circle" 
                size={100} 
                color={colors.primary.main} 
                style={styles.profileIcon}
              />
              {!demoMode && (
                <View style={styles.demoIndicator}>
                  <Text style={styles.demoIndicatorText}>DEMO</Text>
                </View>
              )}
            </Pressable>
            {!demoMode && (
              <Text style={styles.tapToActivate}>Tap to activate demo mode</Text>
            )}
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
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12h</Text>
              <Text style={styles.statLabel}>Focus Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>85%</Text>
              <Text style={styles.statLabel}>Avg. Score</Text>
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
  profileImageOuterCircle: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 57,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
    margin: 0,
    padding: 0,
  },
  demoIndicator: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demoIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profilePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  tapToActivate: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ProfileScreen; 