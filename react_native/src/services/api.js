import axios from 'axios';
import { Platform } from 'react-native';
import webSocketService from './websocket';
import { API_BASE_URL } from '../config/apiConfig';

// Log the API URL being used
console.log('Using API URL:', API_BASE_URL, 'for platform:', Platform.OS);

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

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });
    
    console.log('Upload response status:', response.status);
    console.log('Upload response data:', response.data);
    
    if (!response.data || !response.data.jobId) {
      throw new Error('Invalid response from server: missing jobId');
    }
    
    // Ensure WebSocket connection is established
    if (!webSocketService.isConnected()) {
      console.log('Connecting to WebSocket for real-time updates');
      webSocketService.connect();
    }
    
    // Subscribe to job updates via WebSocket
    const jobId = response.data.jobId;
    if (webSocketService.isConnected()) {
      webSocketService.subscribeToJob(jobId);
    }
    
    // Return an object with id property to match the expected format
    return { id: jobId };
  } catch (error) {
    console.error('Error uploading audio:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
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
    const response = await axios.get(`${API_BASE_URL}/status/${fileId}`);
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
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
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
    const response = await axios.get(`${API_BASE_URL}/tracks/${fileId}`);
    console.log('Tracks response:', response.data);
    
    // The server returns the tracks in the expected format
    return response.data;
  } catch (error) {
    console.error('Error getting processed tracks:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Subscribe to real-time updates for a job
export const subscribeToJobUpdates = (jobId, callbacks) => {
  if (!jobId) {
    console.error('Cannot subscribe to updates: Invalid job ID');
    return { unsubscribe: () => {} };
  }
  
  // Ensure WebSocket connection is established
  if (!webSocketService.isConnected()) {
    webSocketService.connect();
  }
  
  const { onStatusUpdate, onComplete, onError } = callbacks;
  
  // Add event listeners for the job
  const statusListener = onStatusUpdate ? 
    webSocketService.addEventListener('status_update', data => {
      if (data.jobId === jobId) {
        onStatusUpdate(data);
      }
    }) : null;
  
  const completeListener = onComplete ? 
    webSocketService.addEventListener('processing_complete', data => {
      if (data.jobId === jobId) {
        onComplete(data);
      }
    }) : null;
  
  const errorListener = onError ? 
    webSocketService.addEventListener('processing_error', data => {
      if (data.jobId === jobId) {
        onError(data);
      }
    }) : null;
  
  // Subscribe to the job
  if (webSocketService.isConnected()) {
    webSocketService.subscribeToJob(jobId);
  }
  
  // Return unsubscribe function
  return {
    unsubscribe: () => {
      // Remove event listeners
      if (statusListener) statusListener();
      if (completeListener) completeListener();
      if (errorListener) errorListener();
      
      // Unsubscribe from job
      if (webSocketService.isConnected()) {
        webSocketService.unsubscribeFromJob(jobId);
      }
    }
  };
}; 