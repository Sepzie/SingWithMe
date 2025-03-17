import { v4 as uuidv4 } from 'uuid';

// Add uuidv4 to the global scope
if (typeof global !== 'undefined') {
  // For React Native
  global.uuidv4 = uuidv4;
} else if (typeof window !== 'undefined') {
  // For web
  window.uuidv4 = uuidv4;
}

// Also patch the expo-modules-core if it exists
try {
  const expoModulesCore = require('expo-modules-core');
  if (expoModulesCore && !expoModulesCore.uuidv4) {
    expoModulesCore.uuidv4 = uuidv4;
  }
} catch (e) {
  // Module might not be available, ignore
  console.warn('Could not patch expo-modules-core:', e.message);
}

export { uuidv4 }; 