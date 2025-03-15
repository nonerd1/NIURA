const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Expo doesn't support these options directly in the exported config
// We need to modify the config object before exporting it
config.server = {
  https: true
};

module.exports = config; 