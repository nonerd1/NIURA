#!/bin/bash

# Open the simulator first
xcrun simctl boot "iPhone 16 Pro" &>/dev/null || true
open -a Simulator

# Wait for simulator to fully boot
echo "Waiting for simulator to boot..."
sleep 5

# Start the Metro bundler in a separate terminal
osascript -e 'tell application "Terminal" to do script "cd \"'$PWD'\" && npx react-native start"' &>/dev/null

# Wait for Metro to start
echo "Starting Metro bundler..."
sleep 5

# Launch the app using direct method
cd ios
xcrun simctl install booted NIURA.app || true
xcrun simctl launch booted io.niura.app

echo "App should be launching in the simulator!" 