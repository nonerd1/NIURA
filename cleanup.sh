#!/bin/bash

# Cleanup script for NIURA app sharing

echo "NIURA Project Cleanup Script"
echo "============================"
echo 
echo "This script will remove unnecessary files for sharing."
echo "Directories like node_modules and Pods will need to be reinstalled by the recipient."
echo

# Confirm before proceeding
read -p "Continue with cleanup? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Cleanup cancelled."
  exit 0
fi

# Create backup directory
mkdir -p backup

# Move package lock files based on choice
read -p "Which package manager do you use? (yarn/npm): " pkg_manager
if [[ $pkg_manager == "yarn" ]]; then
  echo "Keeping yarn.lock, removing package-lock.json"
  [ -f package-lock.json ] && mv package-lock.json backup/
elif [[ $pkg_manager == "npm" ]]; then
  echo "Keeping package-lock.json, removing yarn.lock"
  [ -f yarn.lock ] && mv yarn.lock backup/
else
  echo "Invalid choice, keeping both lock files for now."
fi

# Remove large directories
echo "Removing node_modules directory..."
[ -d node_modules ] && rm -rf node_modules

echo "Removing Pods directory..."
[ -d ios/Pods ] && rm -rf ios/Pods

echo "Removing build directories..."
[ -d ios/build ] && rm -rf ios/build
[ -d android/build ] && rm -rf android/build
[ -d android/app/build ] && rm -rf android/app/build

# Remove system files
echo "Removing .DS_Store files..."
find . -name ".DS_Store" -delete

# Optional: Remove .git directory
read -p "Remove .git directory? This will remove version history. (y/n): " remove_git
if [[ $remove_git == "y" || $remove_git == "Y" ]]; then
  echo "Removing .git directory..."
  [ -d .git ] && mv .git backup/
fi

# Remove .expo cache
echo "Removing .expo cache..."
[ -d .expo ] && rm -rf .expo

echo "Cleanup complete!"
echo "The app is now ready to be shared. Recipient should follow the README installation instructions." 