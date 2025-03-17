# SingWithMe Mobile App

This is the React Native mobile app for SingWithMe, which allows users to upload audio files, separate vocals from instrumentals, and display timestamped lyrics.

## Features

- Audio file upload
- Vocal and instrumental track playback
- Volume and pitch control for each track
- Synchronized lyrics display
- Real-time highlighting of current lyrics

## Prerequisites

- Node.js 14+
- Expo CLI
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
API_URL=http://YOUR_SERVER_IP:5000/api
```

Replace `YOUR_SERVER_IP` with:
- `10.0.2.2` for Android emulator
- `localhost` for iOS simulator
- Your machine's actual IP address for physical devices

## Running the App

### Development

```bash
# Start the Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## Project Structure

```
react_native/
├── assets/                # Static assets like images
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── AudioPlayer/   # Audio playback controls
│   │   ├── FileUpload/    # File upload component
│   │   └── LyricsDisplay/ # Lyrics display component
│   ├── screens/           # App screens
│   │   └── MainScreen.js  # Main application screen
│   └── services/          # Business logic and API services
│       ├── api.js         # API communication
│       └── audioProcessor.js # Audio processing logic
├── App.js                 # Main app component
├── app.config.js          # Expo configuration
└── package.json           # Dependencies and scripts
```

## API Integration

The app communicates with the SingWithMe backend server for:
- Uploading audio files
- Checking processing status
- Retrieving processed tracks and lyrics

## Troubleshooting

### API Connection Issues

If you're having trouble connecting to the API:
1. Ensure the server is running
2. Check that the API_URL in your .env file is correct for your environment
3. For physical devices, make sure your device is on the same network as the server

### Audio Playback Issues

If audio doesn't play correctly:
1. Check that the audio files are properly downloaded
2. Ensure the device has sufficient permissions
3. Try restarting the app

## License

[MIT License](LICENSE) 