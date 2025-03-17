const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add the polyfill to the list of modules to be included in the bundle
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-modules-core': path.resolve(__dirname, './src/utils/expo-modules-core.js'),
};

module.exports = config; 