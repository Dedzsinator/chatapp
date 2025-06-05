import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'RealChat',
  slug: 'realchat',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.realchat.app',
    infoPlist: {
      NSCameraUsageDescription: 'This app uses the camera to capture photos for sharing in chats.',
      NSMicrophoneUsageDescription: 'This app uses the microphone to record voice messages.',
      NSPhotoLibraryUsageDescription: 'This app accesses the photo library to share images in chats.',
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.realchat.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK'
    ]
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro'
  },
  plugins: [
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'The app accesses your photos to share them in chats.',
        cameraPermission: 'The app accesses your camera to take photos for sharing in chats.'
      }
    ]
  ],
  extra: {
    eas: {
      projectId: 'your-project-id-here'
    }
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  runtimeVersion: {
    policy: 'sdkVersion'
  }
});
