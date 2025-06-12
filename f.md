# RealChat Frontend

Cross-platform messaging app built with React Native + Expo.

## Platforms Supported
- 📱 iOS (native)
- 🤖 Android (native) 
- 🌐 Web (react-native-web)
- 🖥️ Desktop (Electron)

## Tech Stack
- **React Native** with Expo SDK
- **TypeScript** for type safety
- **React Navigation** for routing
- **Zustand** for state management
- **React Query** for server state
- **WebSocket** for real-time communication
- **React Native Reanimated** for animations
- **Expo Vector Icons** for icons

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- For iOS: Xcode
- For Android: Android Studio

### Installation
```bash
npm install
```

### Development
```bash
# Web
npm run web

# iOS Simulator
npm run ios

# Android Emulator  
npm run android

# Desktop (Electron)
npm run electron
```

## Architecture

### State Management
- **Zustand stores** for app state
- **React Query** for server state caching
- **WebSocket manager** for real-time updates

### Features
- 🔐 JWT authentication
- 💬 Real-time messaging
- 👥 Group chats
- 🟢 Presence indicators
- ✅ Message delivery receipts
- 🔍 Message search
- 📱 Push notifications
- 🎨 Dark/light themes
- 🌍 Offline support

### Performance Optimizations
- Message virtualization for large chats
- Image lazy loading and caching
- Optimistic UI updates
- Message deduplication
- Connection resilience
