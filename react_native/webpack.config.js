const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Fix for Platform module not found
  config.resolve.alias = {
    ...config.resolve.alias,
    // Alias the react-native modules for web
    'react-native$': 'react-native-web',
    'react-native-sound': path.resolve(__dirname, './src/polyfills/sound-polyfill.js'),
    'react-native-slider': path.resolve(__dirname, './src/polyfills/slider-polyfill.js'),
    'react-native-track-player': path.resolve(__dirname, './src/polyfills/track-player-polyfill.js'),
  };

  return config;
}; 