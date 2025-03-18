import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Title } from 'react-native-paper';
import { FileUpload } from '../components/FileUpload/FileUpload';
import { AudioPlayer } from '../components/AudioPlayer/AudioPlayer';
import { LyricsDisplay } from '../components/LyricsDisplay/LyricsDisplay';

export const MainScreen = ({ navigation, route }) => {
  const [tracks, setTracks] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Check if tracks were passed in via route params
  useEffect(() => {
    if (route?.params?.tracks) {
      setTracks(route.params.tracks);
    }
  }, [route?.params?.tracks]);

  const handleUploadComplete = (processedTracks) => {
    setTracks(processedTracks);
    // Navigate to player screen with the processed tracks
    navigation.navigate('Player', { tracks: processedTracks });
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Title style={styles.title}>SingWithMe</Title>
      
      {!tracks ? (
        <FileUpload onUploadComplete={handleUploadComplete} />
      ) : (
        <View style={styles.playerContainer}>
          <AudioPlayer
            vocalTrack={tracks.vocal}
            instrumentalTrack={tracks.instrumental}
            onTimeUpdate={handleTimeUpdate}
          />
          <LyricsDisplay
            lyrics={tracks.lyrics}
            currentTime={currentTime}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 24,
  },
  playerContainer: {
    flex: 1,
  },
}); 