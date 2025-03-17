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

// Monkey patch the expo-modules-core module
const originalRequire = module.constructor.prototype.require;
module.constructor.prototype.require = function(id) {
  const result = originalRequire.apply(this, arguments);
  
  // If this is the expo-modules-core module, patch it
  if (id === 'expo-modules-core' && result && typeof result === 'object' && !result.uuidv4) {
    result.uuidv4 = uuidv4;
  }
  
  return result;
};

// Register the main component
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App); 