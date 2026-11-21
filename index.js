const { Platform } = require('react-native');

if (Platform.OS !== 'web') {
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals();
}

require('expo-router/entry');
