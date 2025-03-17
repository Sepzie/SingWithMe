import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';

export const FileUpload = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        await uploadFile(result);
      }
    } catch (err) {
      setError('Error selecting file');
      console.error('File selection error:', err);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response = await api.uploadAudio(file);
      
      // Poll for processing status
      const checkStatus = async (jobId) => {
        const status = await api.checkProcessingStatus(jobId);
        if (status.state === 'completed') {
          const tracks = await api.getProcessedTracks(jobId);
          onUploadComplete(tracks);
        } else if (status.state === 'processing') {
          setUploadProgress(status.progress || uploadProgress);
          setTimeout(() => checkStatus(jobId), 1000);
        } else {
          throw new Error('Processing failed');
        }
      };

      await checkStatus(response.jobId);
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={pickAudioFile}
        disabled={uploading}
        style={styles.button}
      >
        Select Audio File
      </Button>

      {uploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator animating={true} />
          <Text style={styles.progressText}>
            Processing: {Math.round(uploadProgress * 100)}%
          </Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    marginVertical: 8,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  progressText: {
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
}); 