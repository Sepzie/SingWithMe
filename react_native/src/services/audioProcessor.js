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
      // Use simple settings to avoid errors
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
      this.isAudioInitialized = true;
      console.log('Audio mode set successfully');
    } catch (error) {
      console.error('Failed to set audio mode, continuing anyway:', error);
      // Continue anyway, as this might not be critical
      this.isAudioInitialized = true;
    }
  }

  async loadTracks(vocalUrl, instrumentalUrl) {
    try {
      // Initialize audio first
      await this.initializeAudio();
      
      // Release any existing tracks first
      await this.release();
      
      console.log('Loading vocal track from:', vocalUrl);
      // Load vocal track
      const { sound: vocalSound } = await Audio.Sound.createAsync(
        { uri: vocalUrl },
        { shouldPlay: false }
      );
      this.vocalSound = vocalSound;
      
      console.log('Loading instrumental track from:', instrumentalUrl);
      // Load instrumental track
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
      console.warn('Cannot play: tracks not loaded');
      return;
    }
    
    try {
      if (this.vocalSound) {
        console.log('Playing vocal track');
        await this.vocalSound.playAsync();
      }
      
      if (this.instrumentalSound) {
        console.log('Playing instrumental track');
        await this.instrumentalSound.playAsync();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  async pause() {
    try {
      if (this.vocalSound) {
        console.log('Pausing vocal track');
        await this.vocalSound.pauseAsync();
      }
      
      if (this.instrumentalSound) {
        console.log('Pausing instrumental track');
        await this.instrumentalSound.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
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
        console.log('Releasing vocal track');
        await this.vocalSound.unloadAsync();
        this.vocalSound = null;
      }
      
      if (this.instrumentalSound) {
        console.log('Releasing instrumental track');
        await this.instrumentalSound.unloadAsync();
        this.instrumentalSound = null;
      }
      
      this.isLoaded = false;
    } catch (error) {
      console.error('Error releasing audio resources:', error);
    }
  }
} 