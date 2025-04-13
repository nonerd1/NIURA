#!/bin/bash

# Stop all node processes
echo "Stopping all Node processes..."
killall -9 node

# Clear watchman watches
echo "Clearing watchman watches..."
watchman watch-del-all

# Clear Metro bundler cache
echo "Removing Metro bundler cache..."
rm -rf $TMPDIR/metro-*
rm -rf node_modules/.cache

# Clear Yarn cache
echo "Clearing Yarn cache..."
yarn cache clean

# Clear React Native cache
echo "Clearing React Native cache..."
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/haste-*

# Reinstall node modules
echo "Reinstalling node modules..."
rm -rf node_modules
yarn install

# Start Expo in tunnel mode
echo "Starting Expo in tunnel mode..."
npx expo start --tunnel

echo "Reset complete!" 