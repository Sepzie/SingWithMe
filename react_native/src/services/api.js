import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the API URL from environment variables or use a default
// For different environments:
// - Android emulator: 10.0.2.2 (special IP that connects to host machine)
// - iOS simulator: localhost
// - Physical device: Your machine's actual IP address on the network
let API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:5000/api';

// Adjust for platform if needed
if (Platform.OS === 'ios' && API_BASE_URL.includes('10.0.2.2')) {
  // Replace Android emulator IP with localhost for iOS
  API_BASE_URL = API_BASE_URL.replace('10.0.2.2', 'localhost');
}

console.log('Using API URL:', API_BASE_URL);

export const api = {
  uploadAudio: async (audioFile) => {
    const formData = new FormData();
    // Change 'audio' to 'file' to match the server's expected field name
    formData.append('file', {
      uri: audioFile.uri,
      type: 'audio/mpeg',
      name: audioFile.name
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  checkProcessingStatus: async (jobId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Status check error:', error);
      throw error;
    }
  },

  getProcessedTracks: async (jobId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tracks/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Get tracks error:', error);
      throw error;
    }
  }
}; 