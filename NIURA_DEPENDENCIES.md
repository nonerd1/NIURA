# NIURA Project: Installation Guide

This document provides detailed instructions for setting up the NIURA mental readiness monitoring application on your development environment.

## Prerequisites

Before installing the NIURA app, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (LTS recommended)
- **npm** (Node Package Manager) or **Yarn**
- **Git** (for version control)
- **Expo CLI**: `npm install -g expo-cli`
- **Xcode** (for iOS development, macOS only)
- **Android Studio** (for Android development)

## Installation Instructions

1. **Clone or unzip the project**:
   ```bash
   # If using the zip file
   unzip NIURA_Project.zip -d NIURA
   cd NIURA
   
   # Or if cloning from a repository
   git clone <repository-url>
   cd NIURA
   ```

2. **Install dependencies**:
   ```bash
   # Using npm
   npm install
   
   # Or using Yarn
   yarn install
   ```

3. **Install iOS dependencies** (macOS only):
   ```bash
   npx pod-install
   ```

## Dependencies Explained

The NIURA app relies on the following key dependencies:

### Core Dependencies

- **React (v18.3.1)**: Frontend UI library
- **React Native (v0.76.7)**: Framework for building native apps using React
- **Expo (v52.0.37)**: Platform for universal React applications

### Navigation

- **@react-navigation/native (v7.0.15)**: Navigation container
- **@react-navigation/bottom-tabs (v7.2.0)**: Tab navigation
- **@react-navigation/native-stack (v7.2.1)**: Stack navigation
- **@react-navigation/stack (v7.1.1)**: Advanced stack navigation
- **@react-navigation/material-top-tabs (v7.1.0)**: Material design top tabs
- **react-native-safe-area-context (v4.14.1)**: Safe area utilities
- **react-native-screens (v4.4.0)**: Native navigation primitives

### UI Components

- **@expo/vector-icons (v14.0.4)**: Icon library
- **react-native-svg (v15.11.2)**: SVG support for React Native
- **expo-blur (v14.0.3)**: Blur effects
- **expo-haptics (v14.0.1)**: Haptic feedback
- **expo-linear-gradient (v14.0.2)**: Gradient effects
- **lottie-react-native (v7.1.0)**: Animation support
- **expo-symbols (v0.2.2)**: Symbols for UI

### Data Visualization

- **react-native-chart-kit (v6.12.0)**: Chart components
- **react-native-svg-charts (v5.4.0)**: SVG charts
- **react-native-speedometer (v1.0.5)**: Speedometer visualization
- **react-native-circular-progress (v1.4.1)**: Circular progress indicators

### Calendar & Time

- **react-native-calendars (v1.1310.0)**: Calendar functionality

### User Interface Enhancements

- **react-native-gesture-handler (v2.20.2)**: Gesture recognition
- **react-native-reanimated (v3.16.1)**: Advanced animations
- **react-native-pager-view (v6.5.1)**: View pager component
- **react-native-tab-view (v4.0.5)**: Tab views
- **react-native-webview (v13.12.5)**: Web content display

### Other Utilities

- **expo-constants (v17.0.7)**: Expo constants
- **expo-linking (v7.0.5)**: Deep linking
- **expo-splash-screen (v0.29.22)**: Splash screen management
- **expo-status-bar (v2.0.1)**: Status bar management
- **expo-system-ui (v4.0.8)**: System UI integration
- **expo-web-browser (v14.0.2)**: Web browser support
- **@react-native-picker/picker (v2.11.0)**: Picker components
- **@react-native-masked-view/masked-view (v0.3.2)**: Masked views

## Running the App

After installation, you can run the app using:

```bash
# Start the Expo development server
npx expo start

# For iOS (macOS only)
npx expo run:ios

# For Android
npx expo run:android
```

## Using the App with Expo Go

For quick testing without building the full app:

1. Install "Expo Go" app on your iOS or Android device
2. Run `npx expo start`
3. Scan the QR code with your device camera (iOS) or Expo Go app (Android)

## Common Issues & Troubleshooting

### Missing Dependencies

If you encounter errors about missing packages:
```bash
npm install <package-name>
```

### Metro Bundler Issues

If Metro Bundler crashes or gets stuck:
```bash
# Clear Metro cache
npx react-native start --reset-cache
```

### iOS Build Issues

For iOS build problems:
```bash
cd ios
pod install
cd ..
```

### Android Build Issues

For Android SDK errors, ensure your `local.properties` file in the `android` folder correctly points to your Android SDK location.

### Expo Issues

For Expo-specific problems:
```bash
# Clear Expo cache
npx expo start -c
```

## Development Note

The NIURA app uses a context-based demo mode system (`src/context/DemoContext.tsx`) that simulates sensor data when real hardware is not available. This is perfect for testing and demonstration purposes. 