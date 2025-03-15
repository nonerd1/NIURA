# NIURA: Mental State Tracking App

This mobile application allows users to track their mental state by monitoring focus and stress levels. The app features Bluetooth connectivity for real-time metrics tracking.

## App Structure Overview

```
NIURA/
├── src/                      # Main source code
│   ├── screens/              # Application screens
│   │   ├── HomeScreen.tsx    # Main dashboard with mental state metrics
│   │   ├── BluetoothScreen.tsx # Device connection management
│   │   └── ...               # Other screens
│   ├── components/           # Reusable UI components
│   ├── navigation/           # Navigation configuration
│   ├── context/              # React context providers
│   │   └── DemoContext.tsx   # Demo mode state management
│   ├── theme/                # Styling and theme variables
│   │   └── colors.ts         # Color definitions
│   └── types/                # TypeScript type definitions
├── assets/                   # Images, fonts, and static resources
├── ios/                      # iOS-specific native code
├── android/                  # Android-specific native code
├── app.json                  # Expo configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This documentation
```

## Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   yarn install
   # or if using npm
   npm install
   ```
   > **Note:** After cleaning the project for sharing, TypeScript might show "Cannot find module" errors. These are normal and will disappear after installing dependencies.

3. iOS setup:
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. Start the development server:
   ```bash
   yarn start
   # or
   npx expo start
   ```

## For Windows/Linux Users (Android-only Development)

If you're developing on a Windows or Linux machine, you'll only be able to work with the Android version of the app:

1. Skip the iOS setup step above

2. Make sure you have Android development tools installed:
   - [Android Studio](https://developer.android.com/studio)
   - Android SDK
   - An Android emulator or physical device for testing

3. Set up your environment variables:
   - Add ANDROID_HOME pointing to your Android SDK location
   - Add platform-tools to your PATH

4. Run the Android version:
   ```bash
   npx expo run:android
   ```

5. For Bluetooth functionality:
   - Emulators have limited Bluetooth support
   - Testing on a physical Android device is recommended
   - The app will use mock data in demo mode if no Bluetooth device is connected

**Note:** Some minor adjustments might be needed for Android-specific functionality, as this app was primarily developed and tested on iOS.

## Running the App

### iOS
```bash
npx expo run:ios
```

### Android
```bash
npx expo run:android
```

### Using Expo Go
For testing basic functionality without Bluetooth:
```bash
npx expo start
```
Then scan the QR code with the Expo Go app on your device.

## Important Notes

1. **Bluetooth Functionality**: 
   - Bluetooth features require a physical device for testing
   - Simulator/emulator testing will show mock data

2. **Removed Directories**:
   The following directories were removed to reduce the package size:
   - `node_modules/` - Reinstall with `yarn install` or `npm install`
   - `ios/Pods/` - Reinstall with `cd ios && pod install`

## Project Structure

- `src/` - Main source code
  - `screens/` - App screens
  - `components/` - Reusable components
  - `navigation/` - Navigation setup
  - `context/` - React context providers
  - `theme/` - Styling and theme variables
  - `types/` - TypeScript definitions

- `assets/` - Images, fonts, and other static resources
- `ios/` - iOS-specific code
- `android/` - Android-specific code

## Troubleshooting

If you encounter Bluetooth connectivity issues:
1. Ensure Bluetooth permissions are granted
2. Check that you're testing on a physical device (not simulator)
3. Verify that your device supports Bluetooth Low Energy (BLE)

For simulator testing, the app will automatically use mock data.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
