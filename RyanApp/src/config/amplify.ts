import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-2',
    userPoolId: 'us-east-2_wzLPL1i6B',
    userPoolWebClientId: '2j3rbovc4b5lh0h9kdeordp1cb',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_PASSWORD_AUTH'
  }
}); 