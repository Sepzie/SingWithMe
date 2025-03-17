import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { Button, ProgressBar, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { uploadAudio, checkProcessingStatus, getProcessedTracks } from '../../services/api';
import webSocketService from '../../services/websocket';

export const FileUpload = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const jobIdRef = useRef(null);
  
  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (jobIdRef.current) {
        // Clean up WebSocket connection when component unmounts
        webSocketService.disconnect();
      }
    };
  }, []);

  const pickAudioFile = async () => {
    try {
      console.log('Opening document picker...');
      
      // Use DocumentPicker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      
      console.log('Document picker result:', JSON.stringify(result, null, 2));

      // Handle both old and new DocumentPicker response formats
      let file;
      
      // Check if it's the old format (type: 'success' or 'cancel')
      if (result.type === 'success') {
        // Old format - result itself is the file
        file = {
          uri: result.uri,
          name: result.name,
          mimeType: result.mimeType,
          size: result.size
        };
      } else if (result.type === 'cancel') {
        console.log('User cancelled file picker');
        return;
      } else if (result.canceled === true) {
        // New format - canceled property
        console.log('User cancelled file picker');
        return;
      } else if (result.assets && result.assets.length > 0) {
        // New format - assets array
        file = result.assets[0];
      } else {
        console.error('Unrecognized document picker result format:', result);
        setError('Failed to get file. Please try again.');
        return;
      }
      
      console.log('Selected file details:', JSON.stringify(file, null, 2));
      
      // Validate file
      if (!file || !file.uri) {
        console.error('Invalid file object:', file);
        setError('Invalid file selected. Please try again.');
        return;
      }
      
      // Ensure file has all required properties
      const fileToUpload = {
        uri: file.uri,
        name: file.name || 'audio.mp3',
        mimeType: file.mimeType || 'audio/mpeg',
        size: file.size || 0
      };
      
      console.log('Prepared file for upload:', fileToUpload);
      await uploadFile(fileToUpload);
    } catch (err) {
      console.error('Error picking document:', err);
      setError(`Error selecting file: ${err.message}`);
      Alert.alert('Error', `Failed to select file: ${err.message}`);
    }
  };

  const uploadFile = async (file) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 0.05;
          return newProgress > 0.9 ? 0.9 : newProgress;
        });
      }, 500);

      // Upload the file
      console.log('Uploading file to server...', file);
      const uploadResponse = await uploadAudio(file);
      console.log('Upload response:', uploadResponse);
      
      clearInterval(progressInterval);
      setUploadProgress(1);
      
      setTimeout(() => {
        setIsUploading(false);
        setIsProcessing(true);

        // If we have a job ID, start monitoring with WebSocket
        if (uploadResponse && uploadResponse.id) {
          jobIdRef.current = uploadResponse.id;
          setupSimpleWebSocketListener(uploadResponse.id);
        } else {
          throw new Error('Invalid response from server');
        }
      }, 500);
    } catch (err) {
      console.error('Error uploading file:', err);
      setIsUploading(false);
      setIsProcessing(false);
      setError(`Error uploading file: ${err.message}`);
      Alert.alert('Upload Error', `Failed to upload file: ${err.message}`);
    }
  };

  const setupSimpleWebSocketListener = (jobId) => {
    console.log('Setting up simple WebSocket listener for job:', jobId);
    
    // Set up a fallback timer to switch to polling if WebSocket fails
    const fallbackTimer = setTimeout(() => {
      console.log('WebSocket not responding, falling back to polling');
      pollProcessingStatus(jobId);
    }, 10000); // 10 second timeout
    
    // Make sure WebSocket is connected
    if (!webSocketService.isConnected()) {
      webSocketService.connect();
    }
    
    // Listen only for processing complete events
    webSocketService.addEventListener('processing_complete', async (data) => {
      // Check if this is for our job
      if (data.jobId === jobId) {
        console.log('WebSocket: Processing complete!', data);
        clearTimeout(fallbackTimer);
        
        try {
          // Get the processed tracks
          console.log('Processing completed, getting tracks...');
          const tracksResponse = await getProcessedTracks(jobId);
          console.log('Tracks response:', tracksResponse);
          
          setIsProcessing(false);
          
          // Call the callback with the processed tracks
          if (onUploadComplete && tracksResponse) {
            onUploadComplete(tracksResponse);
          } else {
            throw new Error('Invalid tracks response from server');
          }
          
          // Clean up WebSocket
          webSocketService.disconnect();
          jobIdRef.current = null;
        } catch (err) {
          handleProcessingError(err);
        }
      }
    });
    
    // Listen for error events
    webSocketService.addEventListener('processing_error', (data) => {
      // Check if this is for our job
      if (data.jobId === jobId) {
        console.error('WebSocket: Processing error:', data);
        clearTimeout(fallbackTimer);
        handleProcessingError(new Error(data.error || 'Processing failed'));
      }
    });
    
    // Subscribe to job updates
    if (webSocketService.isConnected()) {
      webSocketService.subscribeToJob(jobId);
    }
  };

  const handleProcessingError = (err) => {
    console.error('Error processing file:', err);
    setIsProcessing(false);
    setError(`Error processing file: ${err.message}`);
    Alert.alert('Processing Error', `Failed to process file: ${err.message}`);
    
    // Clean up WebSocket
    webSocketService.disconnect();
    jobIdRef.current = null;
  };

  // Fallback polling method (in case WebSocket fails)
  const pollProcessingStatus = async (fileId) => {
    try {
      console.log('Starting to poll for processing status...');
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 30; // Maximum number of polling attempts
      
      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts}`);
        
        // Wait for 2 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await checkProcessingStatus(fileId);
        console.log('Status response:', statusResponse);
        
        if (statusResponse.status === 'completed') {
          isComplete = true;
          
          // Get the processed tracks
          console.log('Processing completed, getting tracks...');
          const tracksResponse = await getProcessedTracks(fileId);
          console.log('Tracks response:', tracksResponse);
          
          setIsProcessing(false);
          
          // Call the callback with the processed tracks
          if (onUploadComplete && tracksResponse) {
            onUploadComplete(tracksResponse);
          } else {
            throw new Error('Invalid tracks response from server');
          }
        } else if (statusResponse.status === 'failed') {
          throw new Error('Processing failed on the server');
        }
        // else continue polling
      }
      
      if (!isComplete) {
        throw new Error('Processing timed out');
      }
    } catch (err) {
      handleProcessingError(err);
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {isUploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.statusText}>Uploading...</Text>
          <ProgressBar progress={uploadProgress} color="#6200ee" style={styles.progressBar} />
        </View>
      )}
      
      {isProcessing && (
        <View style={styles.processingContainer}>
          <Text style={styles.statusText}>Processing audio...</Text>
          <ActivityIndicator animating={true} color="#6200ee" size="large" />
          <Text style={styles.statusText}>Waiting for completion via WebSocket...</Text>
        </View>
      )}
      
      {!isUploading && !isProcessing && (
        <Button
          mode="contained"
          onPress={pickAudioFile}
          style={styles.button}
        >
          Select Audio File
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 20,
    width: '80%',
  },
  progressContainer: {
    width: '100%',
    marginVertical: 20,
  },
  processingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  statusText: {
    marginBottom: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
}); 