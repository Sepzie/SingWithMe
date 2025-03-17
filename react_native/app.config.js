const { getDefaultConfig } = require('expo/metro-config');
require('dotenv').config();

const ENV = {
  dev: {
    environment: 'development',
    apiUrl: process.env.API_URL_DEV || 'http://10.0.0.48:5000/api',
    wsUrl: process.env.WS_URL_DEV || 'http://10.0.0.48:5000',
  },
  staging: {
    environment: 'staging',
    apiUrl: process.env.API_URL_STAGING || 'https://staging-api.singwithme.app/api',
    wsUrl: process.env.WS_URL_STAGING || 'https://staging-api.singwithme.app',
  },
  prod: {
    environment: 'production',
    apiUrl: process.env.API_URL_PROD || 'https://api.singwithme.app/api',
    wsUrl: process.env.WS_URL_PROD || 'https://api.singwithme.app',
  },
};

// Get the environment from the EXPO_ENV environment variable or default to dev
const getEnv = () => {
  const expoEnv = process.env.EXPO_ENV || 'dev';
  return ENV[expoEnv] || ENV.dev;
};

const currentEnv = getEnv();

module.exports = {
  name: "SingWithMe",
  slug: "singwithme",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.singwithme.app"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    package: "com.singwithme.app"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    environment: currentEnv.environment,
    apiUrl: currentEnv.apiUrl,
    wsUrl: currentEnv.wsUrl,
    eas: {
      projectId: "your-project-id" // Add your EAS Project ID when you have one
    }
  }
}; 