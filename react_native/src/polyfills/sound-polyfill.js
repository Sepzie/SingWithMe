// This is a simple polyfill for react-native-sound for web
// It uses the Web Audio API to provide similar functionality

class Sound {
  static setCategory() {
    // No-op for web
    console.log('Sound.setCategory is a no-op on web');
  }

  constructor(url, basePath, onLoad) {
    this.url = url;
    this.audio = new Audio(url);
    this.volume = 1.0;
    this.isPlaying = false;
    this.duration = 0;
    
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration;
      if (onLoad) {
        onLoad(null);
      }
    });
    
    this.audio.addEventListener('error', (error) => {
      console.error('Error loading audio:', error);
      if (onLoad) {
        onLoad(error);
      }
    });
  }

  play(onEnd) {
    this.audio.play().then(() => {
      this.isPlaying = true;
    }).catch(error => {
      console.error('Error playing audio:', error);
      if (onEnd) {
        onEnd(false);
      }
    });
    
    this.audio.onended = () => {
      this.isPlaying = false;
      if (onEnd) {
        onEnd(true);
      }
    };
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  }

  setVolume(volume) {
    this.volume = volume;
    this.audio.volume = volume;
  }

  setCurrentTime(time) {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  getCurrentTime(callback) {
    if (callback) {
      callback(this.audio ? this.audio.currentTime : 0);
    }
    return this.audio ? this.audio.currentTime : 0;
  }

  release() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }
}

module.exports = Sound; 