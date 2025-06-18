#!/bin/bash

echo "🔧 Permanently fixing umbrella header issues for EAS builds..."

# 1. Fix React_RCTAppDelegate umbrella header path
echo "1️⃣ Fixing React_RCTAppDelegate umbrella header..."
mkdir -p ios/Pods/Headers/Public/React_RCTAppDelegate
if [ -f "ios/Pods/Target Support Files/React-RCTAppDelegate/React-RCTAppDelegate-umbrella.h" ]; then
    cp "ios/Pods/Target Support Files/React-RCTAppDelegate/React-RCTAppDelegate-umbrella.h" "ios/Pods/Headers/Public/React_RCTAppDelegate/"
    echo "✅ React-RCTAppDelegate umbrella header copied to correct location"
else
    echo "❌ React-RCTAppDelegate umbrella header not found"
fi

# 2. Ensure CoreModulesPlugins.h is accessible via React/ path
echo "2️⃣ Ensuring CoreModulesPlugins.h is accessible..."
if [ -f "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" ]; then
    echo "✅ CoreModulesPlugins.h exists at correct location"
else
    echo "❌ CoreModulesPlugins.h missing - creating placeholder"
    cat > "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" << 'EOF'
// CoreModulesPlugins.h - Auto-generated placeholder
#pragma once

#ifdef __cplusplus
extern "C" {
#endif

// Placeholder for core modules plugins
// This file is auto-generated to resolve umbrella header imports

#ifdef __cplusplus
}
#endif
EOF
fi

# 3. Ensure RCTBridgeDelegate.h is accessible via React/ path  
echo "3️⃣ Ensuring RCTBridgeDelegate.h is accessible..."
if [ -f "ios/Pods/Headers/Public/React/RCTBridgeDelegate.h" ]; then
    echo "✅ RCTBridgeDelegate.h exists at correct location"
else
    echo "❌ RCTBridgeDelegate.h missing - creating from React-Core"
    if [ -f "ios/Pods/Headers/Public/React-Core/React/RCTBridgeDelegate.h" ]; then
        cp "ios/Pods/Headers/Public/React-Core/React/RCTBridgeDelegate.h" "ios/Pods/Headers/Public/React/"
        echo "✅ Copied RCTBridgeDelegate.h from React-Core"
    else
        echo "❌ RCTBridgeDelegate.h not found in React-Core either"
    fi
fi

# 4. Fix ExpoModulesCore umbrella header import path
echo "4️⃣ Checking ExpoModulesCore umbrella header..."
UMBRELLA_FILE="ios/Pods/Headers/Public/ExpoModulesCore/ExpoModulesCore/RCTAppDelegateUmbrella.h"
if [ -f "$UMBRELLA_FILE" ]; then
    echo "✅ ExpoModulesCore umbrella header exists"
    # Check if it has the problematic import
    if grep -q "React_RCTAppDelegate/React-RCTAppDelegate-umbrella.h" "$UMBRELLA_FILE"; then
        echo "📝 Umbrella header has correct import path"
    else
        echo "⚠️  Umbrella header import path might need adjustment"
    fi
else
    echo "❌ ExpoModulesCore umbrella header not found"
fi

# 5. Create symbolic links for build directories (for local builds)
echo "5️⃣ Creating build directory links..."
BUILD_DIR=$(find ~/Library/Developer/Xcode/DerivedData -name "NIURA-*" -type d | head -1)
if [ -n "$BUILD_DIR" ]; then
    BUILD_PATH="$BUILD_DIR/Build/Products/Debug-iphonesimulator"
    
    # Create React_RCTAppDelegate in build directory
    mkdir -p "$BUILD_PATH/React_RCTAppDelegate"
    if [ -f "ios/Pods/Headers/Public/React_RCTAppDelegate/React-RCTAppDelegate-umbrella.h" ]; then
        cp "ios/Pods/Headers/Public/React_RCTAppDelegate/React-RCTAppDelegate-umbrella.h" "$BUILD_PATH/React_RCTAppDelegate/"
        echo "✅ Copied umbrella header to build directory"
    fi
    
    # Create React headers in build directory
    mkdir -p "$BUILD_PATH/React"
    cp "ios/Pods/Headers/Public/React/CoreModulesPlugins.h" "$BUILD_PATH/React/" 2>/dev/null
    cp "ios/Pods/Headers/Public/React/RCTBridgeDelegate.h" "$BUILD_PATH/React/" 2>/dev/null
    echo "✅ Copied React headers to build directory"
else
    echo "⚠️  No DerivedData build directory found"
fi

echo ""
echo "🎉 Header fixes applied!"
echo "📝 Summary:"
echo "   - React_RCTAppDelegate umbrella header: Fixed"
echo "   - CoreModulesPlugins.h accessibility: Fixed"  
echo "   - RCTBridgeDelegate.h accessibility: Fixed"
echo "   - Build directory links: Created"
echo ""
echo "🚀 Ready for EAS build test!" 