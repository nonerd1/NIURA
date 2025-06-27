import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { authService } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

type ResetPasswordScreenProps = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const { colors, getScaledFontSize } = useTheme();
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { email } = route.params;

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background.dark,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.dark,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    title: {
      fontSize: getScaledFontSize(32),
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: getScaledFontSize(16),
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    form: {
      backgroundColor: colors.background.card,
      borderRadius: 10,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: getScaledFontSize(14),
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background.dark,
      borderWidth: 1,
      borderColor: '#3A4452',
      borderRadius: 5,
      padding: 15,
      fontSize: getScaledFontSize(16),
      color: colors.text.primary,
    },
    resetButton: {
      backgroundColor: colors.primary.main,
      borderRadius: 5,
      padding: 15,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    buttonText: {
      color: colors.text.primary,
      fontSize: getScaledFontSize(16),
      fontWeight: 'bold',
    },
    backButton: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    backButtonText: {
      color: colors.primary.main,
      fontSize: getScaledFontSize(16),
      fontWeight: '500',
    },
  });

  const handleResetPassword = async () => {
    if (!verificationCode || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setIsLoading(true);
      await authService.forgotPasswordSubmit(email, verificationCode, newPassword);
      Alert.alert(
        'Success',
        'Your password has been reset successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0E1624" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter the verification code sent to {email} and your new password
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter verification code"
                  placeholderTextColor="#666666"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#666666"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#666666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default ResetPasswordScreen; 