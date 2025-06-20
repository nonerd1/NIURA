const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for path aliases
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'components'),
  '@/constants': path.resolve(__dirname, 'constants'),
  '@/hooks': path.resolve(__dirname, 'hooks'),
  '@/assets': path.resolve(__dirname, 'assets'),
};

module.exports = config; 