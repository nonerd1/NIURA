#!/bin/bash
echo "🔧 Comprehensive header fix starting..."

# Function to fix umbrella headers
fix_umbrella_headers() {
    local file="$1"
    if [ -f "$file" ]; then
        sed -i '' 's|"ExpoModulesCore/ExpoModulesCore/|"ExpoModulesCore/|g' "$file"
        sed -i '' 's|"ExpoModulesCore/EXAppDelegatesLoader.h"|"ExpoModulesCore/EXAppDelegatesLoader.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/EXAppDelegateWrapper.h"|"ExpoModulesCore/EXAppDelegateWrapper.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/EXLegacyAppDelegateWrapper.h"|"ExpoModulesCore/EXLegacyAppDelegateWrapper.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/RCTAppDelegateUmbrella.h"|"ExpoModulesCore/RCTAppDelegateUmbrella.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/EXPermissionsMethodsDelegate.h"|"ExpoModulesCore/EXPermissionsMethodsDelegate.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/EXModuleRegistryDelegate.h"|"ExpoModulesCore/EXModuleRegistryDelegate.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/EXReactDelegateWrapper.h"|"ExpoModulesCore/EXReactDelegateWrapper.h"|g' "$file"
        sed -i '' 's|"ExpoModulesCore/RCTAppDelegate+Recreate.h"|"ExpoModulesCore/RCTAppDelegate+Recreate.h"|g' "$file"
        echo "✅ Fixed: $file"
    fi
}

# Fix all umbrella header locations
fix_umbrella_headers "Pods/Target Support Files/ExpoModulesCore/ExpoModulesCore-umbrella.h"
fix_umbrella_headers "Pods/Headers/Public/ExpoModulesCore/ExpoModulesCore-umbrella.h"

# Fix DerivedData umbrella headers
for file in /Users/ishaan/Library/Developer/Xcode/DerivedData/NIURA-*/Build/Products/Debug-iphoneos/ExpoModulesCore/ExpoModulesCore-umbrella.h; do
    fix_umbrella_headers "$file"
done

# Ensure React/React directory structure
mkdir -p Headers/Public/React/React
cd Headers/Public/React/React
rm -f *.h
ln -sf ../../React-Core/React/RCTBridgeDelegate.h . 2>/dev/null || true
ln -sf ../../React-Core/React/CoreModulesPlugins.h . 2>/dev/null || true
cd /Users/ishaan/NIURA/ios

echo "🎉 Comprehensive header fix completed!" 