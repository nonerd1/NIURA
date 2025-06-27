import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import { apiConfig } from '../config/amplify';

// Remove all AWS Amplify related code
// Remove references to SignUpOutput, signUp, signIn, getCurrentUser, fetchUserAttributes, confirmSignUp, signOut, AsyncStorage
// Remove ExtendedAuthUser and related logic
// Remove any remaining AWS Amplify logic

export interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gender: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  attributes?: Record<string, string>;
  nextStep?: {
    signUpStep: string;
  };
}

// Backend API response interfaces
interface BackendAuthResponse {
  user: {
    id: number | string;
    email: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  token?: string; // JWT token if your backend provides it
  access_token?: string; // Alternative token field name
}

interface BackendRegisterResponse {
  code: string;
  message: string;
  data: {
    id: number | string;
    email: string;
    full_name: string;
    created_at: string;
  };
}

interface BackendErrorResponse {
  message?: string;
  detail?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

class AuthService {
  private currentUser: User | null = null;

  async signUp({ email, password, firstName, lastName, gender }: SignUpParams): Promise<User> {
    try {
      console.log('Starting sign up process for:', email);
      
      // Make API call to your backend
      const response = await apiClient.post<BackendRegisterResponse>(
        apiConfig.endpoints.register,
        {
          email,
          password,
          full_name: `${firstName} ${lastName}`,
          gender,
        }
      );

      console.log('✅ Registration successful! Response:', response.data);

      // Check if registration was successful
      if (response.data.code !== "00") {
        throw new Error(response.data.message || 'Registration failed');
      }

      // Transform backend response to your app's User format
      const user: User = {
        id: String(response.data.data.id),
        email: response.data.data.email,
        firstName: firstName, // Use the input values since backend only returns full_name
        lastName: lastName,
      };

      this.currentUser = user;
      await this.storeSession(user);
      
      console.log('✅ User created and session stored successfully');
      return user;
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw new Error(error.message || 'Failed to sign up. Please try again.');
    }
  }

  async signIn({ email, password }: SignInParams): Promise<User> {
    try {
      console.log('Starting sign in process for:', email);
      
      // Try form data instead of JSON
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      // Make API call to your backend - POST /api/login
      const response = await apiClient.post<{access_token: string, token_type: string}>(
        apiConfig.endpoints.login,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('✅ Login successful! Token received');

      // Store the access token
      const token = response.data.access_token;
      if (token) {
        await AsyncStorage.setItem('authToken', token);
      }

      // Create user object (we'll need to fetch user details separately later)
      const user: User = {
        id: '1', // Temporary - we'll get this from a separate API call later
        email: email,
        firstName: 'User', // Temporary - we'll get this from user profile API
        lastName: '', // Temporary
      };

      this.currentUser = user;
      await this.storeSession(user);
      
      console.log('✅ User session stored successfully');
      return user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Failed to sign in. Please check your credentials and try again.');
    }
  }

  async signOut(): Promise<void> {
    try {
      // Try to call backend logout endpoint if it exists
      try {
        await apiClient.post(apiConfig.endpoints.logout);
      } catch (error) {
        // Ignore logout endpoint errors, still clear local data
        console.warn('Backend logout failed, but clearing local data:', error);
      }

      // Clear all stored auth data
      await AsyncStorage.multiRemove(['authToken', 'accessToken', 'idToken', 'user']);
      this.currentUser = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const user = await AsyncStorage.getItem('user');
      return !!(token && user);
    } catch {
      return false;
    }
  }

  // Debug function to get current JWT token
  async getCurrentToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        console.log('🔑 Current JWT Token:');
        console.log('Full token:', token);
        console.log('Token preview:', `${token.substring(0, 50)}...`);
        
        // Decode JWT payload (just for info, doesn't validate)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', payload);
          console.log('Token expires:', new Date(payload.exp * 1000));
          console.log('Token issued for user:', payload.sub);
        } catch (decodeError) {
          console.log('Could not decode token payload');
        }
        
        return token;
      } else {
        console.log('❌ No auth token found in AsyncStorage');
        return null;
      }
    } catch (error) {
      console.error('Error getting current token:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }
      
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.currentUser = user;
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // 🔧 UPDATED: Forgot Password - POST /api/forgot-password
  async forgotPassword(email: string): Promise<void> {
    try {
      console.log('Initiating forgot password for:', email);
      
      const response = await apiClient.post(
        apiConfig.endpoints.forgotPassword,
        { email }
      );
      
      console.log('Forgot password request sent successfully');
      // The backend should send an email with reset instructions
    } catch (error: any) {
      console.error('Error initiating forgot password:', error);
      throw new Error(error.message || 'Failed to send password reset email. Please try again.');
    }
  }

  // 🔧 UPDATED: Reset Password - POST /api/reset-password
  async forgotPasswordSubmit(email: string, code: string, newPassword: string): Promise<void> {
    try {
      console.log('Submitting new password for:', email);
      
      const response = await apiClient.post(
        apiConfig.endpoints.resetPassword,
        {
          email,
          code, // or token, depending on your backend
          new_password: newPassword,
        }
      );
      
      console.log('Password reset successful');
    } catch (error: any) {
      console.error('Error submitting new password:', error);
      throw new Error(error.message || 'Failed to reset password. Please check your reset code and try again.');
    }
  }

  // 🔧 NEW: Delete User Account - DELETE /api/users/{id}
  async deleteUserAccount(userId?: string): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      const userIdToDelete = userId || currentUser?.id;
      
      if (!userIdToDelete) {
        throw new Error('No user ID provided for deletion');
      }
      
      console.log('Deleting user account:', userIdToDelete);
      
      const deleteUrl = apiClient.buildUrl(
        apiConfig.endpoints.deleteUser,
        { id: userIdToDelete }
      );
      
      await apiClient.delete(deleteUrl);
      
      // Clear local data after successful deletion
      await AsyncStorage.multiRemove(['authToken', 'accessToken', 'idToken', 'user']);
      this.currentUser = null;
      
      console.log('User account deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user account:', error);
      throw new Error(error.message || 'Failed to delete user account. Please try again.');
    }
  }

  // 🔧 NEW: Update User Profile - PUT /api/users/{id}
  async updateUserProfile(updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
  }, userId?: string): Promise<User> {
    try {
      const currentUser = await this.getCurrentUser();
      const userIdToUpdate = userId || currentUser?.id;
      
      if (!userIdToUpdate) {
        throw new Error('No user ID provided for update');
      }
      
      console.log('Updating user profile:', userIdToUpdate, updates);
      
      const updateUrl = apiClient.buildUrl(
        apiConfig.endpoints.updateUser,
        { id: userIdToUpdate }
      );
      
      const response = await apiClient.put<BackendAuthResponse>(updateUrl, updates);
      
      // Transform backend response to your app's User format
      const updatedUser: User = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        firstName: response.data.user.first_name || updates.first_name || currentUser?.firstName || '',
        lastName: response.data.user.last_name || updates.last_name || currentUser?.lastName || '',
      };

      // Update stored user data
      this.currentUser = updatedUser;
      await this.storeSession(updatedUser);
      
      console.log('User profile updated successfully');
      return updatedUser;
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update profile. Please try again.');
    }
  }

  // 🔧 NEW: Get User Profile - GET /api/profile
  async getUserProfile(): Promise<{
    id: string;
    email: string;
    full_name: string;
    gender: string;
    created_at: string;
  }> {
    try {
      console.log('Fetching user profile from backend...');
      
      // Debug: Check if we have an auth token
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔑 Auth token available:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await apiClient.get<{
        id: string;
        email: string;
        full_name: string;
        gender: string;
        created_at: string;
      }>('/profile');
      
      console.log('✅ User profile fetched successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching user profile:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw new Error(error.message || 'Failed to fetch user profile. Please try again.');
    }
  }

  // 🔧 NEW: Get User Profile Stats - GET /api/profile/stats
  async getUserProfileStats(): Promise<{
    sessions: number;
    focus_time: string;
    avg_score: string;
  }> {
    try {
      console.log('Fetching user profile statistics from backend...');
      
      // Debug: Check if we have an auth token
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔑 Auth token available:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await apiClient.get<{
        sessions: number;
        focus_time: string;
        avg_score: string;
      }>('/profile/stats');
      
      console.log('✅ User profile stats fetched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching user profile stats:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw new Error(error.message || 'Failed to fetch profile statistics. Please try again.');
    }
  }

  // 🔧 NEW: Update User Profile - PUT /api/profile
  async updateProfile(updates: {
    full_name?: string;
    gender?: string;
  }): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      full_name: string;
      gender: string;
    };
  }> {
    try {
      console.log('Updating user profile:', updates);
      
      const response = await apiClient.put<{
        message: string;
        user: {
          id: string;
          email: string;
          full_name: string;
          gender: string;
        };
      }>('/profile', updates);
      
      console.log('✅ User profile updated successfully');
      return response.data;
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update profile. Please try again.');
    }
  }

  // 🔧 NEW: Get User Preferences - GET /api/profile/preferences
  async getUserPreferences(): Promise<{
    focus_alert_threshold: number;
    stress_alert_threshold: number;
    notifications_enabled: boolean;
    dark_mode_enabled: boolean;
  }> {
    try {
      console.log('Fetching user preferences from backend...');
      
      const response = await apiClient.get<{
        focus_alert_threshold: number;
        stress_alert_threshold: number;
        notifications_enabled: boolean;
        dark_mode_enabled: boolean;
      }>('/profile/preferences');
      
      console.log('✅ User preferences fetched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching user preferences:', error);
      throw new Error(error.message || 'Failed to fetch user preferences. Please try again.');
    }
  }

  // 🔧 NEW: Update User Preferences - PUT /api/profile/preferences
  async updateUserPreferences(preferences: {
    focus_alert_threshold?: number;
    stress_alert_threshold?: number;
    notifications_enabled?: boolean;
    dark_mode_enabled?: boolean;
  }): Promise<{
    message: string;
    preferences: {
      focus_alert_threshold: number;
      stress_alert_threshold: number;
      notifications_enabled: boolean;
      dark_mode_enabled: boolean;
    };
  }> {
    try {
      console.log('Updating user preferences:', preferences);
      
      const response = await apiClient.put<{
        message: string;
        preferences: {
          focus_alert_threshold: number;
          stress_alert_threshold: number;
          notifications_enabled: boolean;
          dark_mode_enabled: boolean;
        };
      }>('/profile/preferences', preferences);
      
      console.log('✅ User preferences updated successfully');
      return response.data;
    } catch (error: any) {
      console.error('Error updating user preferences:', error);
      throw new Error(error.message || 'Failed to update preferences. Please try again.');
    }
  }

  private async storeSession(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('Successfully stored user data');
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  async verifyAuth(): Promise<boolean> {
    return this.isAuthenticated();
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      console.log('Confirming sign up for:', email);
      // TODO: Implement signup confirmation logic if your backend requires it
      // await apiClient.post('/auth/verify-email', { email, code });
      throw new Error('Email verification functionality not yet implemented');
    } catch (error: any) {
      console.error('Error confirming sign up:', error);
      throw new Error(error.message || 'Failed to confirm sign up. Please check your verification code and try again.');
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      console.log('Resending verification code to:', email);
      // TODO: Implement verification code resend logic
      // await apiClient.post('/auth/resend-verification', { email });
      throw new Error('Resend verification functionality not yet implemented');
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      throw new Error(error.message || 'Failed to resend verification code. Please try again.');
    }
  }

  async handleAuthCode(code: string): Promise<void> {
    try {
      console.log('Handling auth code:', code);
      // TODO: Implement OAuth code handling logic
      throw new Error('OAuth code handling not yet implemented');
    } catch (error: any) {
      console.error('Error handling auth code:', error);
      throw new Error(error.message || 'Failed to handle authentication code. Please try again.');
    }
  }

  async signInWithGoogle(): Promise<User> {
    try {
      console.log('Starting Google sign in process');
      // TODO: Implement Google OAuth sign-in logic with your backend
      // This would typically involve:
      // 1. Get Google OAuth token from the client
      // 2. Send it to your backend for verification
      // 3. Backend returns user data and JWT token
      throw new Error('Google sign-in not yet implemented');
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw new Error(error.message || 'Failed to sign in with Google. Please try again.');
    }
  }
}

export const authService = new AuthService(); 