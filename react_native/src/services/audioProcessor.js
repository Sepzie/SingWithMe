import { Audio } from 'expo-av';

export class AudioProcessor {
  constructor() {
    this.vocalSound = null;
    this.instrumentalSound = null;
    this.isLoaded = false;
    this.isAudioInitialized = false;
  }

  // Initialize the Audio module
  async initializeAudio() {
    if (this.isAudioInitialized) return;
    
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      this.isAudioInitialized = true;
      console.log('Audio mode set successfully');
    } catch (error) {
      console.error('Failed to set audio mode:', error);
      throw error;
    }
  }

  async loadTracks(vocalUrl, instrumentalUrl) {
    try {
      await this.initializeAudio();
      
      // Release any existing tracks first
      await this.release();
      
      // The URLs are already complete paths from the server, no need to modify them
      console.log('Loading vocal track from:', vocalUrl);
      const { sound: vocalSound } = await Audio.Sound.createAsync(
        { uri: vocalUrl },
        { shouldPlay: false }
      );
      this.vocalSound = vocalSound;
      
      console.log('Loading instrumental track from:', instrumentalUrl);
      const { sound: instrumentalSound } = await Audio.Sound.createAsync(
        { uri: instrumentalUrl },
        { shouldPlay: false }
      );
      this.instrumentalSound = instrumentalSound;
      
      this.isLoaded = true;
      
      // Set up status update listeners
      this.vocalSound.setOnPlaybackStatusUpdate(this._onPlaybackStatusUpdate);
      this.instrumentalSound.setOnPlaybackStatusUpdate(this._onPlaybackStatusUpdate);
      
      console.log('Tracks loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load audio tracks:', error);
      await this.release();
      throw error;
    }
  }

  _onPlaybackStatusUpdate = (status) => {
    // Handle playback status updates if needed
    console.log('Playback status:', status);
  }

  async play() {
    if (!this.isLoaded) {
      throw new Error('Tracks not loaded');
    }
    
    try {
      if (this.vocalSound) {
        await this.vocalSound.playAsync();
      }
      
      if (this.instrumentalSound) {
        await this.instrumentalSound.playAsync();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  async pause() {
    try {
      if (this.vocalSound) {
        await this.vocalSound.pauseAsync();
      }
      
      if (this.instrumentalSound) {
        await this.instrumentalSound.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
      throw error;
    }
  }

  async getCurrentTime() {
    if (!this.vocalSound) return 0;
    
    try {
      const status = await this.vocalSound.getStatusAsync();
      return status.positionMillis / 1000; // Convert to seconds
    } catch (error) {
      console.error('Error getting current time:', error);
      return 0;
    }
  }

  async release() {
    try {
      if (this.vocalSound) {
        await this.vocalSound.unloadAsync();
        this.vocalSound = null;
      }
      
      if (this.instrumentalSound) {
        await this.instrumentalSound.unloadAsync();
        this.instrumentalSound = null;
      }
      
      this.isLoaded = false;
    } catch (error) {
      console.error('Error releasing audio resources:', error);
    }
  }
} 