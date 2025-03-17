import Sound from 'react-native-sound';

export class AudioProcessor {
  constructor() {
    Sound.setCategory('Playback');
    this.vocalTrack = null;
    this.instrumentalTrack = null;
    this.vocalVolume = 1.0;
    this.instrumentalVolume = 1.0;
    this.vocalPitch = 0;
    this.instrumentalPitch = 0;
    this.isLoaded = false;
  }

  loadTracks(vocalUrl, instrumentalUrl) {
    return new Promise((resolve, reject) => {
      // Release any existing tracks first
      this.release();
      
      // Load vocal track
      this.vocalTrack = new Sound(vocalUrl, null, (error) => {
        if (error) {
          console.error('Failed to load vocal track:', error);
          reject(new Error(`Failed to load vocal track: ${error.message}`));
          return;
        }
        
        // Load instrumental track
        this.instrumentalTrack = new Sound(instrumentalUrl, null, (error) => {
          if (error) {
            console.error('Failed to load instrumental track:', error);
            // Clean up vocal track if instrumental fails
            if (this.vocalTrack) {
              this.vocalTrack.release();
              this.vocalTrack = null;
            }
            reject(new Error(`Failed to load instrumental track: ${error.message}`));
            return;
          }
          
          // Apply initial volume settings
          this.setVocalVolume(this.vocalVolume);
          this.setInstrumentalVolume(this.instrumentalVolume);
          
          this.isLoaded = true;
          resolve();
        });
      });
    });
  }

  setVocalVolume(volume) {
    this.vocalVolume = volume;
    if (this.vocalTrack) {
      this.vocalTrack.setVolume(volume);
    }
  }

  setInstrumentalVolume(volume) {
    this.instrumentalVolume = volume;
    if (this.instrumentalTrack) {
      this.instrumentalTrack.setVolume(volume);
    }
  }

  // Pitch shifting will be implemented using a Web Audio API based solution
  // or a native module depending on performance requirements
  setVocalPitch(semitones) {
    this.vocalPitch = semitones;
    console.log('Vocal pitch shifting not implemented yet:', semitones);
    // Implementation will be added based on chosen pitch shifting library
  }

  setInstrumentalPitch(semitones) {
    this.instrumentalPitch = semitones;
    console.log('Instrumental pitch shifting not implemented yet:', semitones);
    // Implementation will be added based on chosen pitch shifting library
  }

  play() {
    if (!this.isLoaded) {
      console.warn('Cannot play: tracks not loaded');
      return;
    }
    
    if (this.vocalTrack && this.instrumentalTrack) {
      // Ensure tracks are synchronized
      this.vocalTrack.getCurrentTime((vocalTime) => {
        this.instrumentalTrack.getCurrentTime((instrumentalTime) => {
          // If tracks are out of sync by more than 50ms, reset them
          if (Math.abs(vocalTime - instrumentalTime) > 0.05) {
            this.vocalTrack.setCurrentTime(0);
            this.instrumentalTrack.setCurrentTime(0);
          }
          
          this.vocalTrack.play((success) => {
            if (!success) {
              console.error('Vocal track playback failed');
            }
          });
          
          this.instrumentalTrack.play((success) => {
            if (!success) {
              console.error('Instrumental track playback failed');
            }
          });
        });
      });
    }
  }

  pause() {
    if (this.vocalTrack) {
      this.vocalTrack.pause();
    }
    if (this.instrumentalTrack) {
      this.instrumentalTrack.pause();
    }
  }

  stop() {
    if (this.vocalTrack) {
      this.vocalTrack.stop();
    }
    if (this.instrumentalTrack) {
      this.instrumentalTrack.stop();
    }
  }

  getCurrentTime() {
    if (!this.vocalTrack) return 0;
    
    // This is a synchronous version that returns the last known time
    // For more accurate timing, use the callback version in critical code
    return this.vocalTrack.getCurrentTime();
  }

  release() {
    if (this.vocalTrack) {
      this.vocalTrack.release();
      this.vocalTrack = null;
    }
    if (this.instrumentalTrack) {
      this.instrumentalTrack.release();
      this.instrumentalTrack = null;
    }
    this.isLoaded = false;
  }
} 