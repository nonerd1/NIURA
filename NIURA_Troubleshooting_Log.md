# NIURA App Troubleshooting Log

Date: March 17, 2024

## Current Issues

### 1. Sandbox Error During Build
- Error: `Sandbox: bash(32745) deny(1) file-read-data /Users/ishaan/NIURA/ios/Pods/Target Support Files/Pods-NIURA/expo-configure-project.sh`
- Error message: `Operation not permitted`
- This is a macOS security feature preventing script execution

### 2. Code Warnings
- Multiple "Code will never be executed" warnings in RCT-Folly library
- These are in third-party dependencies and not directly in our app code

### 3. Deprecation Warnings
- Several UI elements using deprecated iOS APIs:
  - statusBarStyle
  - statusBarHidden
  - javascriptEnabled

## Attempted Solutions

### For Sandbox Error:

1. **Fixed script permissions (FAILED)**
   - Made the expo-configure-project.sh script executable:
   ```bash
   chmod +x Pods/Target\ Support\ Files/Pods-NIURA/expo-configure-project.sh
   ```
   - Result: Same sandbox error persisted

2. **Clean and rebuild (FAILED)**
   - Attempted to clean the build and rebuild
   - Result: Same sandbox error persisted

## New Approaches to Try

### Approach 1: Copy and Modify the Script (NEXT STEP)
1. Create a copy of the script outside the sandbox
2. Modify the Podfile to use our custom script instead

### Approach 2: Modify Build Settings
1. Disable sandboxing for the build process in Xcode:
   - Navigate to Build Settings tab
   - Search for "Enable Hardened Runtime"
   - Set to "No"
   - Search for "App Sandbox"
   - Set to "No"

### Approach 3: Try Command Line Build
1. Build directly from command line instead of through Xcode:
   ```bash
   cd ios
   xcodebuild -workspace NIURA.xcworkspace -scheme NIURA -configuration Debug -destination "platform=iOS,name=Ishaan's iPhone"
   ```

## About the "Code will never be executed" Warnings

These warnings are coming from the RCT-Folly library, which is a third-party dependency used by React Native. These warnings are normal and can be safely ignored because:

1. They are in library code, not in your app code
2. The conditions in that library code are designed for specific platforms/configurations
3. This is a known issue with React Native dependencies and doesn't affect your app's functionality

## Next Steps

1. Try building the app again in Xcode after fixing the script permissions
2. If the build still fails, try the next solution (Disabling Library Validation)
3. Once building succeeds, test the BLE functionality with your ESP32 device

## Current Status

- [FAILED] Testing if the permissions fix resolves the build errors
- [FAILED] Clean and rebuild approach
- [IN PROGRESS] Attempting more aggressive solutions
- [Pending] Successfully installing the app on a physical iPhone device
- [Pending] Testing BLE functionality with ESP32 device 