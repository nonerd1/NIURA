import { Amplify } from 'aws-amplify';
import { ResourcesConfig } from 'aws-amplify';

// Cognito configuration
const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_wzLPL1iB',
      userPoolClientId: '2j3rbovc4b5lh0h9kdeordp1cb',
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        phone: false,
        username: false,
        oauth: {
          domain: 'us-east-2wzlpl1i6b.auth.us-east-2.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: ['myapp://callback', 'io.niura.app://callback'],
          redirectSignOut: ['myapp://signout', 'io.niura.app://signout'],
          responseType: 'code',
          providers: ['Google']
        }
      }
    }
  }
};

// Initialize Amplify with the configuration
Amplify.configure(awsConfig); 