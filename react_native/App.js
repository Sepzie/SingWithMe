import React, { useState, useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import axios from 'axios';
import { Platform } from 'react-native';
import { MainScreen } from './src/screens/MainScreen';
// import { Audio } from 'expo-av';

// Define the base URL based on platform
const getApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.0.48:5000/api';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:5000/api';
  } else {
    return 'http://localhost:5000/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

const EndpointTester = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showMainApp, setShowMainApp] = useState(false);

  const addLog = (message) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testHealth = async () => {
    try {
      const healthUrl = `${API_BASE_URL.replace('/api', '')}/health`;
      addLog(`Sending request to: ${healthUrl}`);
      const response = await axios.get(healthUrl);
      addLog(`Health response: ${JSON.stringify(response.data)}`);
      setHealthStatus(response.data.status);
    } catch (error) {
      addLog(`Health error: ${error.message}`);
      setHealthStatus('error');
    }
  };

  useEffect(() => {
    testHealth();
    addLog(`API URL: ${API_BASE_URL}`);
    addLog(`Platform: ${Platform.OS}`);
  }, []);

  const testUploadEndpoint = async () => {
    try {
      // Create a small test form data with minimal audio content
      const formData = new FormData();
      const mockFile = {
        name: 'test.mp3',
        type: 'audio/mpeg',
        uri: 'https://example.com/test.mp3' // This won't have real content but will test the endpoint
      };
      formData.append('file', mockFile);
      
      const uploadUrl = `${API_BASE_URL}/upload`;
      addLog(`Testing upload endpoint: ${uploadUrl} with POST`);
      
      // Use a real POST request with minimal data
      const response = await axios({
        method: 'POST',
        url: uploadUrl,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 5000
      });
      
      addLog(`Upload endpoint POST success! Response: ${response.status}`);
      addLog(`Upload response data: ${JSON.stringify(response.data)}`);
      
      // If we got a jobId, we can use it to test the other endpoints
      if (response.data && response.data.jobId) {
        const jobId = response.data.jobId;
        addLog(`Received jobId: ${jobId} - will use for further tests`);
        
        // Test status endpoint with the actual jobId
        await testStatusEndpoint(jobId);
        
        // Give the server some time to process
        addLog(`Waiting 5 seconds for processing...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Test tracks endpoint with the actual jobId
        await testTracksEndpoint(jobId);
      } else {
        // If we didn't get a jobId, fall back to testing with dummy ID
        await testStatusEndpoint("test-id");
        await testTracksEndpoint("test-id");
      }
      
    } catch (error) {
      addLog(`Upload endpoint POST error: ${error.message}`);
      if (error.response) {
        addLog(`Response status: ${error.response.status}`);
        if (error.response.data) {
          addLog(`Response data: ${JSON.stringify(error.response.data)}`);
        }
      } else if (error.request) {
        addLog(`No response received: ${error.message}`);
      }
      
      // Fall back to testing with dummy ID
      await testStatusEndpoint("test-id");
      await testTracksEndpoint("test-id");
    }
  };

  const testStatusEndpoint = async (jobId) => {
    try {
      const statusUrl = `${API_BASE_URL}/status/${jobId}`;
      addLog(`Testing status endpoint: ${statusUrl} with GET`);
      const response = await axios({
        method: 'GET',
        url: statusUrl,
        timeout: 5000
      });
      addLog(`Status endpoint GET success! Response: ${response.status}`);
      addLog(`Status data: ${JSON.stringify(response.data)}`);
    } catch (error) {
      addLog(`Status endpoint GET error: ${error.message}`);
      if (error.response) {
        addLog(`Response status: ${error.response.status}`);
      } else if (error.request) {
        addLog(`No response received: ${error.message}`);
      }
    }
  };

  const testTracksEndpoint = async (jobId) => {
    try {
      const tracksUrl = `${API_BASE_URL}/tracks/${jobId}`;
      addLog(`Testing tracks endpoint: ${tracksUrl} with GET`);
      const response = await axios({
        method: 'GET',
        url: tracksUrl,
        timeout: 5000
      });
      addLog(`Tracks endpoint GET success! Response: ${response.status}`);
      addLog(`Tracks data: ${JSON.stringify(response.data)}`);
    } catch (error) {
      addLog(`Tracks endpoint GET error: ${error.message}`);
      if (error.response) {
        addLog(`Response status: ${error.response.status}`);
      } else if (error.request) {
        addLog(`No response received: ${error.message}`);
      }
    }
  };

  const testUploadWithRealFile = async () => {
    try {
      addLog('Testing real file upload from Internet Archive...');
      console.log('Starting real file upload test');
      
      // For React Native, we need to use a different approach than fetching the file directly
      // since URL.createObjectURL is not available
      
      // First, let's check if we're on web platform
      if (Platform.OS === 'web') {
        addLog('Using web approach for file upload');
        // URL for Bohemian Rhapsody from Internet Archive
        const audioUrl = 'https://archive.org/download/queen-the-platinum-collection-disk-1/01%20-%20Bohemian%20Rhapsody.mp3';
        
        // Fetch the file (web only)
        addLog(`Fetching from: ${audioUrl}`);
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        // Get the file as a blob
        const blob = await response.blob();
        console.log('Fetched audio file:', blob);
        addLog(`Fetched file: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        
        // For web, we can use URL.createObjectURL
        const file = {
          uri: URL.createObjectURL(blob),
          name: 'bohemian_rhapsody.mp3',
          type: 'audio/mpeg',
          size: blob.size,
        };
        
        // Continue with upload
        await performUpload(file);
      } else {
        // For native platforms, we'll use a fixed URL for the test
        addLog('Using native approach for file upload test');
        addLog('Creating test audio file reference...');
        
        // In a real app, you'd use a library like react-native-fs to download the file first
        // For this test, we'll simulate with a direct reference to the URL
        const file = {
          uri: 'https://archive.org/download/queen-the-platinum-collection-disk-1/01%20-%20Bohemian%20Rhapsody.mp3',
          name: 'bohemian_rhapsody.mp3',
          type: 'audio/mpeg',
        };
        
        addLog(`Using direct URL approach for: ${file.uri}`);
        console.log('Test file reference:', file);
        
        // Continue with upload
        await performUpload(file);
      }
    } catch (error) {
      console.error('Test upload error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        addLog(`Upload error: Server responded with status ${error.response.status}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        addLog(`Upload error: No response from server - ${error.message}`);
      } else {
        console.error('Error setting up request:', error.message);
        addLog(`Upload error: ${error.message}`);
      }
    }
  };

  // Helper function to perform the actual upload
  const performUpload = async (file) => {
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Log the upload details
    addLog(`Uploading to: ${API_BASE_URL}/upload`);
    console.log('Upload form data:', formData);
    console.log('Upload file:', file);
    
    // Send POST request to upload endpoint
    const uploadResponse = await axios({
      method: 'POST',
      url: `${API_BASE_URL}/upload`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        addLog(`Upload progress: ${percent}%`);
        console.log(`Upload progress: ${percent}%`);
      }
    });
    
    console.log('Upload response:', uploadResponse);
    addLog(`Upload success! Response status: ${uploadResponse.status}`);
    addLog(`Job ID: ${uploadResponse.data.jobId}`);
    
    // Track the job ID for status polling
    if (uploadResponse.data && uploadResponse.data.jobId) {
      const jobId = uploadResponse.data.jobId;
      addLog(`Starting to poll status for job: ${jobId}`);
      
      // Poll for status
      let complete = false;
      let attempts = 0;
      
      while (!complete && attempts < 10) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        try {
          addLog(`Status check attempt ${attempts}...`);
          const statusResponse = await axios.get(`${API_BASE_URL}/status/${jobId}`);
          console.log('Status response:', statusResponse.data);
          
          addLog(`Status: ${statusResponse.data.state}`);
          
          if (statusResponse.data.state === 'completed') {
            complete = true;
            addLog('Processing complete! Fetching tracks...');
            
            try {
              const tracksResponse = await axios.get(`${API_BASE_URL}/tracks/${jobId}`);
              console.log('Tracks response:', tracksResponse.data);
              addLog('Tracks retrieved successfully!');
            } catch (tracksError) {
              console.error('Error fetching tracks:', tracksError);
              addLog(`Error fetching tracks: ${tracksError.message}`);
            }
            
            break;
          } else if (statusResponse.data.state === 'failed') {
            addLog(`Processing failed: ${statusResponse.data.error || 'Unknown error'}`);
            break;
          }
        } catch (statusError) {
          console.error('Status check error:', statusError);
          addLog(`Status check error: ${statusError.message}`);
        }
      }
      
      if (!complete) {
        addLog('Status polling timed out');
      }
    }
  };

  if (showMainApp) {
    return <MainScreen />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Connectivity Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>API URL: {API_BASE_URL}</Text>
        <Text style={styles.statusText}>
          Health Status: {' '}
          <Text style={{
            color: healthStatus === 'healthy' ? 'green' : 
                  healthStatus === 'error' ? 'red' : 'orange',
            fontWeight: 'bold'
          }}>
            {healthStatus || 'Unknown'}
          </Text>
        </Text>
        <Text style={styles.statusText}>Platform: {Platform.OS}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Health" 
          onPress={testHealth} 
          color="#4285F4"
        />
        <Button 
          title="Test API" 
          onPress={testUploadEndpoint} 
          color="#0F9D58"
        />
        <Button 
          title="Real Upload" 
          onPress={testUploadWithRealFile} 
          color="#DB4437"
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title={healthStatus === 'healthy' ? "Continue" : "Continue Anyway"} 
          onPress={() => setShowMainApp(true)}
          color={healthStatus === 'healthy' ? "#0F9D58" : "#DB4437"}
        />
      </View>
      
      <Text style={styles.logsTitle}>Logs:</Text>
      <ScrollView style={styles.logs}>
        {logs.map((log, index) => {
          // Color code the logs
          let logStyle = styles.logLine;
          if (log.includes('error') || log.includes('Error')) {
            logStyle = {...styles.logLine, color: '#DB4437'};
          } else if (log.includes('accessible') || log.includes('healthy')) {
            logStyle = {...styles.logLine, color: '#0F9D58'};
          } else if (log.includes('Testing')) {
            logStyle = {...styles.logLine, color: '#4285F4'};
          }
          
          return (
            <Text key={index} style={logStyle}>{log}</Text>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 40,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  statusContainer: {
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  logs: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 5,
    color: '#555',
  },
});

export default function App() {
  const [showTester, setShowTester] = useState(true);
  
  if (showTester) {
    return (
      <PaperProvider>
        <EndpointTester />
      </PaperProvider>
    );
  }
  
  return (
    <PaperProvider>
      <MainScreen />
    </PaperProvider>
  );
} 