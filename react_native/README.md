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

## API Configuration

The app uses a centralized configuration system for managing API endpoints across different environments. This makes it easy to switch between development, staging, and production environments.

### Configuration Files

- **src/config/apiConfig.js**: Central configuration file that exports API URLs based on the current environment
- **.env**: Environment-specific configuration (not committed to Git)
- **.env.example**: Example environment file that can be copied to create your own .env

### How to Configure

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file to match your environment setup:
   ```
   # Development environment
   API_URL_DEV=http://YOUR_LOCAL_IP:5000/api
   WS_URL_DEV=http://YOUR_LOCAL_IP:5000
   
   # Current environment - can be 'dev', 'staging', or 'prod'
   EXPO_ENV=dev
   ```

   Replace `YOUR_LOCAL_IP` with your actual local IP address (e.g., 10.0.0.48) for Android emulator access.

### Running with Different Environments

The package.json includes scripts for running the app in different environments:

```bash
# Development environment
npm run start:dev        # Default development server
npm run android:dev      # Android development build
npm run ios:dev          # iOS development build
npm run web:dev          # Web development build

# Staging environment
npm run start:staging    # Staging server
npm run android:staging  # Android staging build
npm run ios:staging      # iOS staging build
npm run web:staging      # Web staging build

# Production environment
npm run start:prod       # Production server
npm run android:prod     # Android production build
npm run ios:prod         # iOS production build
npm run web:prod         # Web production build
```

### How It Works

- The configuration system reads environment variables from `.env`
- The `app.config.js` file sets up environment-specific configurations
- `apiConfig.js` exports the correct URLs based on the current platform and environment
- Services like API and WebSocket use these exported values instead of hardcoded URLs

This approach makes it easy to deploy to different environments without code changes. 