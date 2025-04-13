import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

class AuthService {
  async signUp({ email, password, name }: SignUpParams): Promise<any> {
    try {
      // Split the full name into given name and family name
      const [firstName, ...lastNameParts] = name.trim().split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const result = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          given_name: firstName,
          family_name: lastName,
        }
      });

      console.log('Sign up result:', result);

      // After successful signup, try to sign in
      if (result.user) {
        return this.signIn({ email, password });
      }
      return result;
    } catch (error: any) {
      console.error('Error signing up:', error);
      if (error.code === 'UsernameExistsException') {
        // Try to sign in if the user already exists
        try {
          return await this.signIn({ email, password });
        } catch (signInError) {
          console.error('Error signing in after signup:', signInError);
          throw signInError;
        }
      }
      throw error;
    }
  }

  async signIn({ email, password }: SignInParams): Promise<any> {
    try {
      console.log('Attempting sign in for:', email);
      const user = await Auth.signIn(email, password);
      console.log('Sign in successful:', user);
      
      // Store the session tokens
      const session = await Auth.currentSession();
      await AsyncStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
      await AsyncStorage.setItem('idToken', session.getIdToken().getJwtToken());
      await AsyncStorage.setItem('refreshToken', session.getRefreshToken().getToken());
      
      return user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      if (error.code === 'UserNotConfirmedException') {
        // Request confirmation code resend
        await Auth.resendSignUp(email);
        throw new Error('Please check your email for the confirmation code');
      }
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await Auth.signOut();
      await AsyncStorage.multiRemove(['accessToken', 'idToken', 'refreshToken']);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await Auth.currentAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<Record<string, string> | null> {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const attributes = await Auth.userAttributes(user);
      return attributes.reduce((acc: Record<string, string>, attribute: any) => {
        acc[attribute.getName()] = attribute.getValue();
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      console.log('Initiating forgot password for:', email);
      await Auth.forgotPassword(email);
    } catch (error) {
      console.error('Error initiating forgot password:', error);
      throw error;
    }
  }

  async forgotPasswordSubmit(email: string, code: string, newPassword: string): Promise<void> {
    try {
      console.log('Submitting new password for:', email);
      await Auth.forgotPasswordSubmit(email, code, newPassword);
    } catch (error) {
      console.error('Error submitting new password:', error);
      throw error;
    }
  }
}

export const authService = new AuthService(); 