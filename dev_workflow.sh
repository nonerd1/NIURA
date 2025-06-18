#!/bin/bash

echo "🚀 NIURA Development Workflow"
echo "Fast development without Xcode indexing delays"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo ""
echo "Choose your development action:"
echo ""
echo "1) 🚀 START EXPO DEV CLIENT (Recommended for daily development)"
echo "2) 🔨 FULL REBUILD (When you've added native dependencies)"
echo "3) ⚡ FAST BUILD (Command line, no Xcode)"
echo "4) 📊 PROJECT STATUS (Check current state)"
echo "5) 🔧 TROUBLESHOOT (Common issues & fixes)"
echo ""

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        print_step "Starting Expo Development Client..."
        print_status "This provides hot reload for React Native code changes"
        print_warning "Make sure you've done an initial build first!"
        echo ""
        
        # Check if development build exists
        if [ ! -d "ios/build/Build/Products/Debug-iphoneos" ]; then
            print_warning "No development build found. You need to build first!"
            echo "Run option 2 or 3 to create initial build"
            exit 1
        fi
        
        print_status "Starting Expo development server..."
        npx expo start --dev-client
        ;;
        
    2)
        print_step "Full rebuild with Expo..."
        print_warning "This will take time but sets up development client"
        echo ""
        
        # Check device connectivity
        print_status "Checking connected devices..."
        xcrun devicectl list devices
        echo ""
        
        print_warning "Make sure 'Ishaan's iPhone' is connected and unlocked!"
        read -p "Press Enter when ready..."
        
        print_status "Building development client (this may take 5-10 minutes)..."
        npx expo run:ios --device
        
        if [ $? -eq 0 ]; then
            print_status "✅ Development build complete!"
            echo ""
            print_status "🎉 NEXT STEPS:"
            echo "1. Run: ./dev_workflow.sh and choose option 1"
            echo "2. Make code changes and see instant hot reload!"
            echo "3. Only rebuild when adding native dependencies"
        else
            print_error "Build failed. Check output above for errors."
        fi
        ;;
        
    3)
        print_step "Fast command line build..."
        print_status "Building without Xcode IDE indexing"
        
        if [ ! -f "fast_build.sh" ]; then
            print_error "fast_build.sh not found!"
            exit 1
        fi
        
        ./fast_build.sh
        ;;
        
    4)
        print_step "Project Status Check..."
        echo ""
        
        print_status "React Native Version:"
        grep '"react-native":' package.json | sed 's/.*"react-native": *"\([^"]*\)".*/\1/'
        echo ""
        
        print_status "Expo Dev Client:"
        if grep -q '"expo-dev-client"' package.json; then
            echo "✅ Installed: $(grep '"expo-dev-client"' package.json | sed 's/.*"expo-dev-client": *"\([^"]*\)".*/\1/')"
        else
            echo "❌ Not installed"
        fi
        echo ""
        
        print_status "iOS Pods:"
        POD_COUNT=$(ls -la ios/Pods/Headers/Public 2>/dev/null | wc -l | tr -d ' ')
        if [ "$POD_COUNT" -gt "100" ]; then
            echo "✅ Properly installed ($POD_COUNT headers)"
        else
            echo "❌ Missing or incomplete"
        fi
        echo ""
        
        print_status "Development Build:"
        if [ -d "ios/build/Build/Products/Debug-iphoneos" ]; then
            echo "✅ Development build exists"
        else
            echo "❌ No development build found"
        fi
        echo ""
        
        print_status "Connected Devices:"
        xcrun devicectl list devices
        ;;
        
    5)
        print_step "Troubleshooting Guide..."
        echo ""
        
        print_status "🔧 COMMON ISSUES & FIXES:"
        echo ""
        echo "📱 Device Issues:"
        echo "  • Device showing 'unavailable' → Connect USB, unlock iPhone, trust computer"
        echo "  • App not installing → Check Apple Developer account, provisioning"
        echo ""
        echo "🏗️ Build Issues:"
        echo "  • 'No development build' → Run option 2 (Full rebuild)"
        echo "  • Expo dev client not connecting → Restart Metro bundler"
        echo "  • Code changes not reflecting → Check if using dev client (option 1)"
        echo ""
        echo "⚡ Performance Issues:"
        echo "  • Xcode indexing slow → Use our scripts instead of Xcode IDE"
        echo "  • Build taking too long → Use option 3 (Fast build)"
        echo ""
        echo "🚀 Best Practices:"
        echo "  • Daily development: Use option 1 (Expo dev client)"
        echo "  • Adding dependencies: Use option 2 (Full rebuild)"
        echo "  • Quick testing: Use option 3 (Fast build)"
        echo ""
        
        print_status "Need more help? Check fast_dev_setup_log.txt"
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac 