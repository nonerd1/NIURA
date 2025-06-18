#!/bin/bash

echo "🚀 NIURA Fast Build Script"
echo "Building without Xcode IDE to avoid indexing delays..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the right directory
if [ ! -d "ios" ]; then
    print_error "Please run this script from the NIURA project root directory"
    exit 1
fi

# Check device connectivity
print_status "Checking connected devices..."
xcrun devicectl list devices

echo ""
print_warning "Make sure your iPhone is connected and unlocked!"
read -p "Press Enter when ready to build..."

echo ""
print_status "Starting build process..."

# Navigate to iOS directory
cd ios

# Build using xcodebuild (bypasses Xcode IDE completely)
print_status "Building with xcodebuild (no Xcode indexing)..."

xcodebuild -workspace NIURA.xcworkspace \
  -scheme NIURA \
  -configuration Debug \
  -destination "platform=iOS,name=Ishaan's iPhone" \
  -derivedDataPath ./build \
  COMPILER_INDEX_STORE_ENABLE=NO \
  CLANG_INDEX_STORE_ENABLE=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  DEVELOPMENT_TEAM="" \
  -quiet

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    print_status "✅ Build completed successfully!"
    print_status "App should be installing to your device..."
    echo ""
    print_status "🎉 BUILD COMPLETE WITHOUT XCODE INDEXING!"
    echo "Total time saved: No indexing delay!"
    echo ""
    print_status "For daily development, use: npx expo start --dev-client"
else
    print_error "❌ Build failed with exit code: $BUILD_EXIT_CODE"
    print_warning "Check the output above for specific errors"
    exit $BUILD_EXIT_CODE
fi

cd .. 