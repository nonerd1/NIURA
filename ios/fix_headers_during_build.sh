#!/bin/bash
echo "🔧 Auto-fixing headers during build..."

# Fix ExpoModulesCore umbrella header in build products
UMBRELLA_FILE="/Users/ishaan/Library/Developer/Xcode/DerivedData/NIURA-*/Build/Products/Debug-iphoneos/ExpoModulesCore/ExpoModulesCore-umbrella.h"
if ls $UMBRELLA_FILE 1> /dev/null 2>&1; then
    sed -i '' 's|"ExpoModulesCore/EXAppDelegatesLoader.h"|"ExpoModulesCore/EXAppDelegatesLoader.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/EXAppDelegateWrapper.h"|"ExpoModulesCore/EXAppDelegateWrapper.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/EXLegacyAppDelegateWrapper.h"|"ExpoModulesCore/EXLegacyAppDelegateWrapper.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/RCTAppDelegateUmbrella.h"|"ExpoModulesCore/RCTAppDelegateUmbrella.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/EXPermissionsMethodsDelegate.h"|"ExpoModulesCore/EXPermissionsMethodsDelegate.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/EXModuleRegistryDelegate.h"|"ExpoModulesCore/EXModuleRegistryDelegate.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/EXReactDelegateWrapper.h"|"ExpoModulesCore/EXReactDelegateWrapper.h"|g' $UMBRELLA_FILE
    sed -i '' 's|"ExpoModulesCore/RCTAppDelegate+Recreate.h"|"ExpoModulesCore/RCTAppDelegate+Recreate.h"|g' $UMBRELLA_FILE
    echo "✅ Fixed ExpoModulesCore umbrella header"
fi

# Ensure React/React directory structure exists
cd /Users/ishaan/NIURA/ios
mkdir -p Headers/Public/React/React
cd Headers/Public/React/React
rm -f *.h
ln -sf ../../React-Core/React/RCTBridgeDelegate.h . 2>/dev/null || true
ln -sf ../../React-Core/React/CoreModulesPlugins.h . 2>/dev/null || true
echo "✅ Fixed React header structure"

echo "🎉 All header fixes applied during build!" 