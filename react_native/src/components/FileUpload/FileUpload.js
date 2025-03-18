import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { Button, ProgressBar, ActivityIndicator, Surface } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { uploadAudio, checkProcessingStatus, getProcessedTracks } from '../../services/api';

export const FileUpload = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const jobIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
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

        // If we have a job ID, start monitoring with polling
        if (uploadResponse && uploadResponse.id) {
          jobIdRef.current = uploadResponse.id;
          startPolling(uploadResponse.id);
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

  const startPolling = (jobId) => {
    console.log('Starting to poll for processing status...');
    
    // Set initial poll
    pollProcessingStatus(jobId);
    
    // Set up polling interval (every 2 seconds)
    pollingIntervalRef.current = setInterval(() => {
      pollProcessingStatus(jobId);
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollProcessingStatus = async (jobId) => {
    try {
      console.log(`Polling for job status: ${jobId}`);
      
      const statusResponse = await checkProcessingStatus(jobId);
      console.log('Status response:', statusResponse);
      
      // Update the status state
      setProcessingStatus(statusResponse);
      
      if (statusResponse.state === 'completed') {
        console.log('Processing completed, getting tracks...');
        
        // Stop polling
        stopPolling();
        
        // Get the processed tracks
        const tracksResponse = await getProcessedTracks(jobId);
        console.log('Tracks response:', tracksResponse);
        
        setIsProcessing(false);
        setProcessingStatus(null);
        
        // Call the callback with the processed tracks
        if (onUploadComplete && tracksResponse) {
          onUploadComplete(tracksResponse);
        } else {
          throw new Error('Invalid tracks response from server');
        }
        
        jobIdRef.current = null;
      } else if (statusResponse.state === 'failed') {
        // Stop polling on failure
        stopPolling();
        handleProcessingError(new Error(statusResponse.error || 'Processing failed on the server'));
      } else if (statusResponse.status === 'completed') {
        // Handle legacy API response format that uses 'status' instead of 'state'
        console.log('Processing completed (legacy API format), getting tracks...');
        
        // Stop polling
        stopPolling();
        
        // Get the processed tracks
        const tracksResponse = await getProcessedTracks(jobId);
        console.log('Tracks response:', tracksResponse);
        
        setIsProcessing(false);
        setProcessingStatus(null);
        
        // Call the callback with the processed tracks
        if (onUploadComplete && tracksResponse) {
          onUploadComplete(tracksResponse);
        } else {
          throw new Error('Invalid tracks response from server');
        }
        
        jobIdRef.current = null;
      }
      // else continue polling
    } catch (err) {
      console.error('Error polling for status:', err);
      
      // Don't stop polling immediately on network errors unless we've hit a threshold
      // This could be a temporary network issue
      if (err.message.includes('Job not found') || err.message.includes('Invalid response')) {
        // If the job is not found or the response is invalid, stop polling
        stopPolling();
        handleProcessingError(err);
      }
    }
  };

  const handleProcessingError = (err) => {
    console.error('Error processing file:', err);
    setIsProcessing(false);
    setError(`Error processing file: ${err.message}`);
    Alert.alert('Processing Error', `Failed to process file: ${err.message}`);
    
    // Clean up polling
    stopPolling();
    jobIdRef.current = null;
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
        <Surface style={styles.processingContainer}>
          <View style={styles.statusHeader}>
            <ActivityIndicator animating={true} color="#6200ee" size="small" />
            <Text style={styles.statusText}>
              {processingStatus?.state === 'processing' 
                ? `Processing audio... ${Math.round((processingStatus.progress || 0) * 100)}%`
                : 'Processing audio...'}
            </Text>
          </View>
          
          {processingStatus?.progress && (
            <ProgressBar 
              progress={processingStatus.progress} 
              color="#6200ee" 
              style={styles.progressBar} 
            />
          )}
        </Surface>
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
    width: '100%',
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    width: '100%',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
}); 