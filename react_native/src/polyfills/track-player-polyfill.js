// This is a simple polyfill for react-native-track-player for web
// It provides stub implementations of the methods used in the app

const TrackPlayer = {
  setupPlayer: async () => {
    console.log('TrackPlayer.setupPlayer is a no-op on web');
    return true;
  },
  
  updateOptions: async () => {
    console.log('TrackPlayer.updateOptions is a no-op on web');
    return true;
  },
  
  add: async () => {
    console.log('TrackPlayer.add is a no-op on web');
    return true;
  },
  
  play: async () => {
    console.log('TrackPlayer.play is a no-op on web');
    return true;
  },
  
  pause: async () => {
    console.log('TrackPlayer.pause is a no-op on web');
    return true;
  },
  
  stop: async () => {
    console.log('TrackPlayer.stop is a no-op on web');
    return true;
  },
  
  reset: async () => {
    console.log('TrackPlayer.reset is a no-op on web');
    return true;
  },
  
  getPosition: async () => {
    console.log('TrackPlayer.getPosition is a no-op on web');
    return 0;
  },
  
  getDuration: async () => {
    console.log('TrackPlayer.getDuration is a no-op on web');
    return 0;
  },
  
  addEventListener: () => {
    console.log('TrackPlayer.addEventListener is a no-op on web');
    return () => {}; // Return a no-op function for cleanup
  },
};

export default TrackPlayer; 