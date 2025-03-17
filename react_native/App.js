import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { Button, Text, Provider as PaperProvider } from 'react-native-paper';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
  const [suond, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);

  // Cleanup sound when component unmounts
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }

      const { uri } = result.assets[0];
      setCurrentFile(result.assets[0].name);

      // Load the audio file
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      
      setSound(audioSound);
      setIsPlaying(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load audio file');
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      Alert.alert('Error', 'Failed to play/pause audio');
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Text style={styles.title}>SingWithMe</Text>
        
        <Button
          mode="contained"
          onPress={pickAudio}
          style={styles.button}
        >
          Select Audio File
        </Button>

        {currentFile && (
          <Text style={styles.filename}>
            Selected: {currentFile}
          </Text>
        )}

        {sound && (
          <Button
            mode="contained"
            onPress={handlePlayPause}
            style={styles.button}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
        )}
        
        <StatusBar style="auto" />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    marginVertical: 10,
  },
  filename: {
    marginVertical: 10,
    textAlign: 'center',
    color: '#666',
  },
}); 