import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Environment types
export const ENV = {
  DEV: 'development',
  STAGING: 'staging',
  PROD: 'production',
};

// Get the current environment from Expo constants or fallback to development
const getCurrentEnvironment = () => {
  try {
    const environment = Constants.expoConfig?.extra?.environment || ENV.DEV;
    return environment;
  } catch (error) {
    console.warn('Failed to get environment from Constants, falling back to development', error);
    return ENV.DEV;
  }
};

// Base URLs for different environments
const API_URLS = {
  [ENV.DEV]: {
    // Local development - use 10.0.0.48 for Android (change to your IP), localhost for iOS/web
    android: 'http://10.0.0.48:5000',
    ios: 'http://localhost:5000',
    web: 'http://localhost:5000',
  },
  [ENV.STAGING]: {
    // Staging environment - replace with your actual staging URLs
    android: 'https://staging-api.singwithme.app',
    ios: 'https://staging-api.singwithme.app',
    web: 'https://staging-api.singwithme.app',
  },
  [ENV.PROD]: {
    // Production environment - replace with your actual production URLs
    android: 'https://api.singwithme.app',
    ios: 'https://api.singwithme.app',
    web: 'https://api.singwithme.app',
  },
};

// Get base URL based on platform and environment
export const getBaseUrl = () => {
  const environment = getCurrentEnvironment();
  const urls = API_URLS[environment] || API_URLS[ENV.DEV];

  if (Platform.OS === 'android') {
    return urls.android;
  } else if (Platform.OS === 'ios') {
    return urls.ios;
  } else {
    return urls.web;
  }
};

// Get API URL (base URL + /api)
export const getApiUrl = () => {
  return `${getBaseUrl()}/api`;
};

// Get WebSocket URL (same as base URL but could be different if needed)
export const getWebSocketUrl = () => {
  return getBaseUrl();
};

// Export for convenience
export const API_BASE_URL = getApiUrl();
export const WEBSOCKET_URL = getWebSocketUrl();

// Log the current configuration
console.log(`[Config] Environment: ${getCurrentEnvironment()}`);
console.log(`[Config] API URL: ${API_BASE_URL}`);
console.log(`[Config] WebSocket URL: ${WEBSOCKET_URL}`);

export default {
  getBaseUrl,
  getApiUrl,
  getWebSocketUrl,
  API_BASE_URL,
  WEBSOCKET_URL,
  ENV,
}; 