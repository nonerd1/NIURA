const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver
  },
  transformer: {
    ...config.transformer
  },
  // Enable HTTPS for development server
  server: {
    protocol: 'https',
    port: 8081,
    host: '10.198.160.137',
    enableVisualizer: true,
    enhanceMiddleware: (middleware) => {
      return middleware;
    }
  }
}; 