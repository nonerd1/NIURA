import { Linking } from 'react-native';
import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { authService } from '../services/auth';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://niura.app'],
  
  async getInitialURL() {
    // First, validation on the URL
    const url = await Linking.getInitialURL();
    return url;
  },

  subscribe(listener) {
    // Listen to incoming links from deep linking
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    return () => {
      // Clean up the event listener
      linkingSubscription.remove();
    };
  },

  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      MainTabs: {
        path: 'home',
        screens: {
          Home: '',
          Insights: 'insights',
          DeepWork: 'deep-work',
          Calendar: 'calendar',
          Options: 'options'
        }
      },
      DetailedMetrics: {
        path: 'metrics/:id',
        parse: {
          id: (id: string) => id
        }
      },
      MentalReadinessDetails: {
        path: 'mental-readiness/:id',
        parse: {
          id: (id: string) => id
        }
      },
      DeepWork: 'deep-work',
      Bluetooth: 'bluetooth',
      Profile: 'profile',
      TherapyJokes: 'therapy-jokes',
      UIKit: 'ui-kit',
      SessionSummary: {
        path: 'session/:id',
        parse: {
          id: (id: string) => id
        }
      }
    }
  }
};

// Handle the OAuth callback
export const handleOAuthCallback = async (url: string) => {
  try {
    if (url.includes('callback')) {
      // Extract the code from the URL
      const code = url.split('code=')[1]?.split('&')[0];
      if (code) {
        // Handle the authentication code
        await authService.handleAuthCode(code);
      }
    } else if (url.includes('signout')) {
      // Handle sign out callback if needed
      await authService.signOut();
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
  }
}; 