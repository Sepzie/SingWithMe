import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Log the API URL being used
console.log('Using API URL:', API_BASE_URL, 'for platform:', Platform.OS);

// Setup axios with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add request interceptor to add authorization header
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication APIs
export const register = async (userData) => {
  try {
    console.log('Registering user:', userData.username);
    const response = await api.post('/auth/register', userData);
    console.log('Registration successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error.message);
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    console.log('Logging in user:', username);
    
    // Create form data (required for OAuth2 form)
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    console.log('Sending login request to:', `${API_BASE_URL}/auth/token`);
    const response = await axios.post(`${API_BASE_URL}/auth/token`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Login successful, token received');
    
    // Store the token
    await AsyncStorage.setItem('token', response.data.access_token);
    console.log('Token stored in AsyncStorage');
    
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error.response?.status, error.response?.data || error.message);
    throw error;
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem('token');
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Error logging out:', error.message);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    console.log('Got current user:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error.message);
    throw error;
  }
};

export const getUserProjects = async () => {
  try {
    const response = await api.get('/projects');
    console.log('Got user projects:', response.data);
    return response.data.projects;
  } catch (error) {
    console.error('Error getting user projects:', error.message);
    throw error;
  }
};

// Upload an audio file to the server
export const uploadAudio = async (file) => {
  try {
    console.log('Uploading file:', JSON.stringify(file, null, 2));
    
    if (!file || !file.uri) {
      throw new Error('Invalid file object: missing URI');
    }
    
    // Create a valid file object for FormData
    const fileData = {
      uri: file.uri,
      name: file.name || 'audio.mp3',
      type: file.mimeType || 'audio/mpeg'
    };
    
    console.log('Prepared file data:', fileData);
    
    const formData = new FormData();
    formData.append('file', fileData);

    console.log('FormData created, sending request to:', `${API_BASE_URL}/upload`);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
    });
    
    console.log('Upload response status:', response.status);
    console.log('Upload response data:', response.data);
    
    if (!response.data || !response.data.jobId) {
      throw new Error('Invalid response from server: missing jobId');
    }
    
    return { id: response.data.jobId };
  } catch (error) {
    console.error('Error uploading audio:', error.message);
    throw error;
  }
};

// Check the processing status of an uploaded file
export const checkProcessingStatus = async (fileId) => {
  try {
    if (!fileId) {
      throw new Error('Invalid file ID');
    }
    
    console.log('Checking status for file:', fileId);
    const response = await api.get(`/status/${fileId}`);
    console.log('Status response:', response.data);
    
    // Convert server response format to client expected format
    const serverStatus = response.data;
    let clientStatus = {
      status: 'processing'
    };
    
    if (serverStatus.state === 'completed') {
      clientStatus.status = 'completed';
    } else if (serverStatus.state === 'failed') {
      clientStatus.status = 'failed';
      clientStatus.error = serverStatus.error;
    }
    
    return clientStatus;
  } catch (error) {
    console.error('Error checking processing status:', error.message);
    throw error;
  }
};

// Get the processed tracks for a file
export const getProcessedTracks = async (fileId) => {
  try {
    if (!fileId) {
      throw new Error('Invalid file ID');
    }
    
    console.log('Getting tracks for file:', fileId);
    const response = await api.get(`/tracks/${fileId}`);
    console.log('Tracks response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error getting processed tracks:', error.message);
    throw error;
  }
}; 