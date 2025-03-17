// Import uuid and add it to global scope
import { v4 as uuidv4 } from 'uuid';

// Add uuidv4 to global scope for both web and native
if (typeof global !== 'undefined') {
  // For React Native
  global.uuidv4 = uuidv4;
} else if (typeof window !== 'undefined') {
  // For web
  window.uuidv4 = uuidv4;
}

// Patch expo-modules-core if it exists
try {
  const expoModulesCore = require('expo-modules-core');
  if (expoModulesCore && typeof expoModulesCore === 'object') {
    expoModulesCore.uuidv4 = uuidv4;
  }
} catch (e) {
  // Module might not be available, ignore
  console.warn('Could not patch expo-modules-core:', e.message);
}

import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { MainScreen } from './src/screens/MainScreen';

export default function App() {
  return (
    <PaperProvider>
      <MainScreen />
    </PaperProvider>
  );
} 