#!/bin/bash

# Print ASCII art header
echo "
███╗   ██╗██╗██╗   ██╗██████╗  █████╗ 
████╗  ██║██║██║   ██║██████╔╝███████║
██╔██╗ ██║██║██║   ██║██████╔╝███████║
██║╚██╗██║██║██║   ██║██╔══██╗██╔══██║
██║ ╚████║██║╚██████╔╝██║  ██║██║  ██║
╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
"

echo "Starting NIURA in local mode..."
echo "----------------------------------------"

# Step 1: Kill any existing Metro processes
echo "Cleaning up existing processes..."
pkill -f "react-native start"
pkill -f "expo start"

# Step 2: Start the Metro bundler with Expo
echo "Starting Expo development server..."
npx expo start --tunnel &
METRO_PID=$!

# Function to handle script termination
cleanup() {
    echo "Shutting down servers..."
    kill $METRO_PID 2>/dev/null
    exit 0
}

# Set up cleanup on script termination
trap cleanup SIGINT SIGTERM

echo "
----------------------------------------
🚀 NIURA is running!

Metro: Running in tunnel mode

Ensure your phone is connected to the internet.
The app will connect through Expo's secure tunnel.

For BLE functionality:
1. Open NIURA.xcworkspace in Xcode
2. Select your iPhone as the target device
3. Click Run (▶️)

To stop servers: Ctrl+C
----------------------------------------"

# Wait for user interrupt
wait 