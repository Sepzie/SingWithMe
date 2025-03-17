import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Slider } from 'react-native-paper';
import { AudioProcessor } from '../../services/audioProcessor';

export const AudioPlayer = ({ vocalTrack, instrumentalTrack, onTimeUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [vocalVolume, setVocalVolume] = useState(1);
  const [instrumentalVolume, setInstrumentalVolume] = useState(1);
  const [vocalPitch, setVocalPitch] = useState(0);
  const [instrumentalPitch, setInstrumentalPitch] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioProcessor = useRef(new AudioProcessor()).current;

  useEffect(() => {
    if (vocalTrack && instrumentalTrack) {
      audioProcessor.loadTracks(vocalTrack, instrumentalTrack)
        .catch(error => {
          console.error('Failed to load audio tracks:', error);
        });
    }
    return () => {
      audioProcessor.release();
    };
  }, [vocalTrack, instrumentalTrack]);

  const togglePlayback = () => {
    if (isPlaying) {
      audioProcessor.pause();
    } else {
      audioProcessor.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVocalVolumeChange = (value) => {
    setVocalVolume(value);
    audioProcessor.setVocalVolume(value);
  };

  const handleInstrumentalVolumeChange = (value) => {
    setInstrumentalVolume(value);
    audioProcessor.setInstrumentalVolume(value);
  };

  const handleVocalPitchChange = (semitones) => {
    setVocalPitch(semitones);
    audioProcessor.setVocalPitch(semitones);
  };

  const handleInstrumentalPitchChange = (semitones) => {
    setInstrumentalPitch(semitones);
    audioProcessor.setInstrumentalPitch(semitones);
  };

  useEffect(() => {
    let timeUpdateInterval;
    if (isPlaying) {
      timeUpdateInterval = setInterval(() => {
        const time = audioProcessor.getCurrentTime();
        setCurrentTime(time);
        if (onTimeUpdate) {
          onTimeUpdate(time);
        }
      }, 100);
    }
    return () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
    };
  }, [isPlaying, onTimeUpdate]);

  return (
    <View style={styles.container}>
      <Button 
        mode="contained" 
        onPress={togglePlayback}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>

      <View style={styles.controlSection}>
        <View style={styles.controlGroup}>
          <Slider
            value={vocalVolume}
            onValueChange={handleVocalVolumeChange}
            minimumValue={0}
            maximumValue={1}
            style={styles.slider}
          />
          <Slider
            value={vocalPitch}
            onValueChange={handleVocalPitchChange}
            minimumValue={-12}
            maximumValue={12}
            step={1}
            style={styles.slider}
          />
        </View>

        <View style={styles.controlGroup}>
          <Slider
            value={instrumentalVolume}
            onValueChange={handleInstrumentalVolumeChange}
            minimumValue={0}
            maximumValue={1}
            style={styles.slider}
          />
          <Slider
            value={instrumentalPitch}
            onValueChange={handleInstrumentalPitchChange}
            minimumValue={-12}
            maximumValue={12}
            step={1}
            style={styles.slider}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  controlSection: {
    marginTop: 16,
  },
  controlGroup: {
    marginVertical: 8,
  },
  slider: {
    marginVertical: 8,
  },
}); 