#!/bin/bash

echo "🔧 Fixing umbrella header path issues..."

# Get DerivedData path
DERIVED_DATA_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "NIURA-*" -type d | head -1)
BUILD_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphonesimulator"

echo "📁 Build path: $BUILD_PATH"

# 1. Fix React_RCTAppDelegate umbrella header issue
echo "1️⃣ Fixing React_RCTAppDelegate umbrella header..."
mkdir -p "$BUILD_PATH/React_RCTAppDelegate"
if [ -f "ios/Pods/Target Support Files/React-RCTAppDelegate/React-RCTAppDelegate-umbrella.h" ]; then
    cp "ios/Pods/Target Support Files/React-RCTAppDelegate/React-RCTAppDelegate-umbrella.h" "$BUILD_PATH/React_RCTAppDelegate/"
    echo "✅ React-RCTAppDelegate-umbrella.h copied"
else
    echo "❌ React-RCTAppDelegate-umbrella.h not found"
fi

# 2. Fix React/CoreModulesPlugins.h issue - create in build path
echo "2️⃣ Fixing React/CoreModulesPlugins.h..."
mkdir -p "$BUILD_PATH/React"
if [ -f "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" ]; then
    cp "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" "$BUILD_PATH/React/"
    echo "✅ CoreModulesPlugins.h copied to build React directory"
else
    echo "❌ CoreModulesPlugins.h not found in Pods"
fi

# 3. Fix React/RCTBridgeDelegate.h issue - create in build path  
echo "3️⃣ Fixing React/RCTBridgeDelegate.h..."
if [ -f "ios/Pods/Headers/Public/React/RCTBridgeDelegate.h" ]; then
    cp "ios/Pods/Headers/Public/React/RCTBridgeDelegate.h" "$BUILD_PATH/React/"
    echo "✅ RCTBridgeDelegate.h copied to build React directory"
else
    echo "❌ RCTBridgeDelegate.h not found in Pods"
fi

# 4. Also create symbolic links in main React headers directory
echo "4️⃣ Creating React header path fixes..."
REACT_HEADERS_PATH="$BUILD_PATH/React-Core/React"
mkdir -p "$REACT_HEADERS_PATH"

if [ -f "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" ]; then
    cp "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" "$REACT_HEADERS_PATH/"
    echo "✅ CoreModulesPlugins.h also copied to React-Core/React"
fi

if [ -f "ios/Pods/Headers/Public/React/RCTBridgeDelegate.h" ]; then
    cp "ios/Pods/Headers/Public/React/RCTBridgeDelegate.h" "$REACT_HEADERS_PATH/"
    echo "✅ RCTBridgeDelegate.h also copied to React-Core/React"
fi

echo "🎉 Umbrella header fixes applied! You can now try building again."
echo "📝 Run: npx expo run:ios" 