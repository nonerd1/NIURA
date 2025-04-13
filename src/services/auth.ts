import { 
  signUp, 
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchUserAttributes, 
  confirmResetPassword, 
  resetPassword, 
  confirmSignUp,
  fetchAuthSession,
  type AuthUser,
  signInWithRedirect
} from 'aws-amplify/auth';
import type { SignUpOutput } from '@aws-amplify/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ExtendedAuthUser extends AuthUser {
  userAttributes: Record<string, string>;
}

class AuthService {
  async signUp({ email, password, firstName, lastName }: SignUpParams): Promise<SignUpOutput> {
    try {
      console.log('Starting sign up process for:', email);
      
      console.log('Attempting sign up with attributes:', {
        email,
        given_name: firstName,
        family_name: lastName
      });

      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
          autoSignIn: false // Disable auto sign in until verification
        }
      });

      console.log('Sign up API response:', {
        isSignUpComplete: result.isSignUpComplete,
        nextStep: result.nextStep,
        userId: result.userId
      });

      // Return the result instead of throwing an error
      return result;
    } catch (error: any) {
      console.error('Detailed sign up error:', {
        code: error.code,
        name: error.name,
        message: error.message,
        details: error
      });
      
      if (error.code === 'UsernameExistsException') {
        throw new Error('This email is already registered. Please try signing in or use a different email.');
      }

      // If it's our verification message, pass it through
      if (error.message.includes('verification code')) {
        throw error;
      }

      throw new Error(error.message || 'Failed to sign up. Please try again.');
    }
  }

  async signIn({ email, password }: SignInParams): Promise<any> {
    try {
      console.log('Starting sign in process for:', email);
      
      // Attempt to sign in
      const signInResult = await signIn({ 
        username: email,  // Use email as username
        password,
        options: {
          // Remove authFlowType as it's handled by Amplify
        }
      });
      
      console.log('Sign in result:', {
        isSignedIn: signInResult.isSignedIn,
        nextStep: signInResult.nextStep
      });
      
      if (signInResult.isSignedIn) {
        try {
          // Get user attributes and store tokens
          const user = await getCurrentUser();
          console.log('Current user fetched:', user);
          
          const userAttributes = await fetchUserAttributes();
          console.log('User attributes fetched:', userAttributes);
          
          await this.storeSession();
          return { 
            user: {
              ...user,
              userAttributes
            } as ExtendedAuthUser
          };
        } catch (userError: any) {
          console.error('Error fetching user details:', {
            code: userError.code,
            name: userError.name,
            message: userError.message,
            stack: userError.stack
          });
          throw userError;
        }
      }

      return { nextStep: signInResult.nextStep };
    } catch (error: any) {
      console.error('Detailed sign in error:', {
        code: error.code,
        name: error.name,
        message: error.message,
        stack: error.stack,
        details: error
      });
      
      if (error.code === 'UserNotConfirmedException') {
        console.log('User not confirmed, requesting confirmation code resend');
        await confirmSignUp({ 
          username: email,
          confirmationCode: '' // This will trigger a resend
        });
        throw new Error('Please check your email for the confirmation code');
      }
      
      // Throw a more informative error
      throw new Error(error.message || 'Failed to sign in. Please check your credentials and try again.');
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut();
      await AsyncStorage.multiRemove(['accessToken', 'idToken']);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }

  async getCurrentUser(): Promise<ExtendedAuthUser | null> {
    try {
      const user = await getCurrentUser();
      const userAttributes = await fetchUserAttributes();
      return {
        ...user,
        userAttributes
      } as ExtendedAuthUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      console.log('Initiating forgot password for:', email);
      await resetPassword({ username: email });
    } catch (error) {
      console.error('Error initiating forgot password:', error);
      throw error;
    }
  }

  async forgotPasswordSubmit(email: string, code: string, newPassword: string): Promise<void> {
    try {
      console.log('Submitting new password for:', email);
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      });
    } catch (error) {
      console.error('Error submitting new password:', error);
      throw error;
    }
  }

  private async storeSession(): Promise<void> {
    try {
      const { tokens } = await fetchAuthSession();
      console.log('Auth session tokens:', {
        hasAccessToken: !!tokens?.accessToken,
        hasIdToken: !!tokens?.idToken,
        accessTokenExpiration: tokens?.accessToken?.payload?.exp,
        idTokenExpiration: tokens?.idToken?.payload?.exp
      });
      
      if (tokens?.accessToken && tokens?.idToken) {
        await AsyncStorage.setItem('accessToken', tokens.accessToken.toString());
        await AsyncStorage.setItem('idToken', tokens.idToken.toString());
        console.log('Successfully stored auth tokens in AsyncStorage');
      } else {
        console.warn('No tokens available to store');
      }
    } catch (error) {
      console.error('Error storing session:', error);
      throw error;
    }
  }

  async handleAuthCode(code: string): Promise<void> {
    try {
      console.log('Handling OAuth callback code');
      const { isSignedIn } = await signIn({ 
        username: 'COGNITO_USER',
        options: {
          authFlowType: 'USER_SRP_AUTH',
          clientMetadata: {
            code
          }
        }
      });
      
      if (isSignedIn) {
        await this.storeSession();
      }
    } catch (error) {
      console.error('Error handling auth code:', error);
      throw error;
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await signInWithRedirect({
        provider: 'Google'
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async verifyAuth(): Promise<boolean> {
    try {
      console.log('Verifying authentication state...');
      
      // Check if user is authenticated
      const user = await getCurrentUser();
      console.log('Current user:', user);
      
      // Get user attributes
      const attributes = await fetchUserAttributes();
      console.log('User attributes:', attributes);
      
      // Verify session tokens
      const { tokens } = await fetchAuthSession();
      const isValid = !!tokens?.accessToken && !!tokens?.idToken;
      console.log('Session valid:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('Auth verification failed:', error);
      return false;
    }
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      console.log('Confirming sign up for:', email);
      await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      console.log('Sign up confirmed successfully');
    } catch (error: any) {
      console.error('Error confirming sign up:', error);
      throw new Error('Failed to confirm sign up. Please check your verification code and try again.');
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      console.log('Resending verification code to:', email);
      await confirmSignUp({
        username: email,
        confirmationCode: ''  // Empty code triggers a resend
      });
      console.log('Verification code resent successfully');
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      throw new Error('Failed to resend verification code. Please try again.');
    }
  }
}

export const authService = new AuthService(); 