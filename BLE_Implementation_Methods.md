# BLE Implementation Methods for NIURA App

This document tracks all the methods that have been attempted to implement Bluetooth Low Energy (BLE) functionality in the NIURA app to connect to an ESP32 device that sends focus and stress data.

## Libraries Used

1. **react-native-ble-plx** - Primary library for BLE implementation
   - Version: 3.5.0
   - Used in context-based implementation

2. **expo-ble** - Expo's BLE library
   - Version: 0.4.2
   - Appears to be installed but no clear implementation found in the codebase

## Implementation Methods

### Method 1: BLEContext.tsx (Context-based Implementation)

**Files:**
- `src/context/BLEContext.tsx`
- `App.tsx` (where BLEProvider is used)

**Configuration:**
- ESP32 Device Name: `NIURA-ESP32`
- Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- Focus Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- Stress Characteristic UUID: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

**Implementation Details:**
- Uses React Context API for state management
- BleManager instance created outside component
- Handles permission requests for Android (including Android 12+)
- Scans for devices with specified Service UUID
- Connects to device matching ESP32_NAME
- Subscribes to characteristic notifications for focus and stress values
- Decodes base64 values to numbers
- Disconnects and cleans up resources when component unmounts

**Status:**
- The implementation is complete but may be experiencing connection issues

### Method 2: Direct Implementation in HomeScreen.tsx (Currently Commented Out)

**Files:**
- `src/screens/HomeScreen.tsx`

**Configuration:**
- ESP32 Device Name: `ESP32-Focus-Stress-Monitor` (different from Method 1)
- Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b` (same as Method 1)
- Focus Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8` (same as Method 1)
- Stress Characteristic UUID: `e70aafb5-a597-4347-b1af-a67c67a075c6` (different from Method 1)

**Implementation Details:**
- Implementation is commented out with note "Comment out BLE initialization for now so QR code will work"
- Would have initialized BLE in component useEffect
- Checks if running on simulator
- Requests permissions
- Scans for ESP32 device
- Would have connected and monitored characteristics if uncommented

**Status:**
- Currently disabled/commented out
- Note suggests there might have been conflicts with QR code functionality

## UI Integration

- `HomeScreen.tsx` includes BLE status indicators and connect/disconnect buttons
- `SpeedometerMetrics.tsx` component is designed to display the focus and stress values received from BLE device
- The app has a demo mode that can be used when BLE is not working

## Common Issues Encountered

1. **Device Name Inconsistency:**
   - Two different device names are used in different files:
     - `NIURA-ESP32` in BLEContext.tsx
     - `ESP32-Focus-Stress-Monitor` in HomeScreen.tsx

2. **Characteristic UUID Inconsistency:**
   - The stress characteristic UUID is different between implementations:
     - `6e400003-b5a3-f393-e0a9-e50e24dcca9e` in BLEContext.tsx
     - `e70aafb5-a597-4347-b1af-a67c67a075c6` in HomeScreen.tsx

3. **QR Code Conflicts:**
   - Comment suggests BLE initialization was disabled to make QR code functionality work, indicating possible resource conflicts

4. **Multiple Libraries:**
   - Both `react-native-ble-plx` and `expo-ble` are installed, possibly causing confusion about which to use

## Next Steps to Try

1. **Verify ESP32 Configuration:**
   - Confirm the correct device name, service UUID, and characteristic UUIDs for your ESP32 device
   - Update all implementations to use the same consistent values

2. **Test with One Implementation at a Time:**
   - Ensure only one BLE implementation is active to prevent conflicts
   - The context-based implementation seems more complete and is currently active in App.tsx

3. **Simplify to Debug:**
   - Start with just connecting to the device without trying to read characteristics
   - Add console.log statements to track the BLE connection process
   - Use the React Native Debugger to monitor BLE events

4. **Check Native Modules:**
   - Verify that the native modules for BLE are properly linked in your React Native project
   - For iOS, check Info.plist for proper Bluetooth usage descriptions
   - For Android, verify AndroidManifest.xml includes required Bluetooth permissions

5. **Try Alternative Libraries:**
   - If `react-native-ble-plx` continues to have issues, consider testing with `expo-ble` instead
   - Make sure to use only one library at a time to avoid conflicts

6. **Use BLE Debugging Tools:**
   - Use a BLE scanner app on another device to verify the ESP32 is advertising correctly
   - Check that the service and characteristic UUIDs are correct 