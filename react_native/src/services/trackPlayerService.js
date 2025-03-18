import TrackPlayer, { Event } from 'react-native-track-player';

class TrackPlayerService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await TrackPlayer.setupPlayer();
      this.isInitialized = true;
      console.log('TrackPlayer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TrackPlayer:', error);
      // If player is already initialized, we can continue
      if (error.code !== 'android_cannot_setup_player_in_background') {
        throw error;
      }
      this.isInitialized = true;
    }
  }

  async loadTracks(vocalUrl, instrumentalUrl) {
    try {
      await this.initialize();
      
      // Reset the player
      await TrackPlayer.reset();
      
      // Add both tracks to the queue
      await TrackPlayer.add([
        {
          url: vocalUrl,
          title: 'Vocal Track',
          artist: 'SingWithMe',
          duration: 0, // Will be updated when loaded
        },
        {
          url: instrumentalUrl,
          title: 'Instrumental Track',
          artist: 'SingWithMe',
          duration: 0, // Will be updated when loaded
        }
      ]);

      // Set up event listeners
      TrackPlayer.addEventListener(Event.PlaybackTrackChanged, this._onTrackChanged);
      TrackPlayer.addEventListener(Event.PlaybackState, this._onPlaybackState);
      
      return true;
    } catch (error) {
      console.error('Failed to load tracks:', error);
      throw error;
    }
  }

  async play() {
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error('Failed to play:', error);
      throw error;
    }
  }

  async pause() {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
      throw error;
    }
  }

  async getCurrentTime() {
    try {
      const position = await TrackPlayer.getPosition();
      return position / 1000; // Convert to seconds
    } catch (error) {
      console.error('Failed to get current time:', error);
      return 0;
    }
  }

  async seekTo(time) {
    try {
      await TrackPlayer.seekTo(time * 1000); // Convert to milliseconds
    } catch (error) {
      console.error('Failed to seek:', error);
      throw error;
    }
  }

  async release() {
    try {
      await TrackPlayer.reset();
      TrackPlayer.remove(Event.PlaybackTrackChanged, this._onTrackChanged);
      TrackPlayer.remove(Event.PlaybackState, this._onPlaybackState);
    } catch (error) {
      console.error('Failed to release player:', error);
    }
  }

  _onTrackChanged = (event) => {
    console.log('Track changed:', event);
  }

  _onPlaybackState = (event) => {
    console.log('Playback state:', event);
  }
}

export const trackPlayerService = new TrackPlayerService(); 