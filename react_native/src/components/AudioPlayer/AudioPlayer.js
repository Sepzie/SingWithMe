import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { AudioProcessor } from '../../services/audioProcessor';

export const AudioPlayer = ({ vocalTrack, instrumentalTrack, onTimeUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const audioProcessor = useRef(new AudioProcessor()).current;

  useEffect(() => {
    const loadTracks = async () => {
      if (vocalTrack && instrumentalTrack) {
        try {
          setIsLoading(true);
          setError(null);
          console.log('Loading tracks:', { vocalTrack, instrumentalTrack });
          await audioProcessor.loadTracks(vocalTrack, instrumentalTrack);
          setIsLoading(false);
        } catch (error) {
          console.error('Failed to load audio tracks:', error);
          setError(`Failed to load audio: ${error.message}`);
          setIsLoading(false);
          Alert.alert('Audio Error', `Failed to load audio tracks: ${error.message}`);
        }
      }
    };
    
    loadTracks();
    
    return () => {
      audioProcessor.release();
    };
  }, [vocalTrack, instrumentalTrack]);

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        console.log('Pausing playback');
        await audioProcessor.pause();
      } else {
        console.log('Starting playback');
        await audioProcessor.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError(`Playback error: ${error.message}`);
      Alert.alert('Playback Error', `Failed to ${isPlaying ? 'pause' : 'play'} audio: ${error.message}`);
    }
  };

  useEffect(() => {
    let timeUpdateInterval;
    if (isPlaying) {
      timeUpdateInterval = setInterval(async () => {
        try {
          const time = await audioProcessor.getCurrentTime();
          setCurrentTime(time);
          if (onTimeUpdate) {
            onTimeUpdate(time);
          }
        } catch (error) {
          console.error('Error getting current time:', error);
        }
      }, 100);
    }
    return () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
    };
  }, [isPlaying, onTimeUpdate]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Loading audio tracks...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={() => setError(null)}
          style={styles.button}
        >
          Dismiss
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.trackInfo}>
        Current Time: {Math.floor(currentTime)} seconds
      </Text>
      
      <Button 
        mode="contained" 
        onPress={togglePlayback}
        style={styles.button}
        disabled={isLoading}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  button: {
    marginVertical: 16,
    width: '80%',
  },
  trackInfo: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  }
}); 