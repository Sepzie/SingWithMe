import { v4 as uuidv4 } from 'uuid';

// Create a minimal polyfill for expo-modules-core
const expoModulesCore = {
  uuidv4,
  // Add other functions as needed
};

module.exports = expoModulesCore; 