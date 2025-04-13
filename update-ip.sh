#!/bin/bash

# Print ASCII art header
echo "
███╗   ██╗██╗██╗   ██╗██████╗  █████╗ 
████╗  ██║██║██║   ██║██╔══██╗██╔══██╗
██╔██╗ ██║██║██║   ██║██████╔╝███████║
██║╚██╗██║██║██║   ██║██╔══██╗██╔══██║
██║ ╚████║██║╚██████╔╝██║  ██║██║  ██║
╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
"

# Get the current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "Your current IP address is: $CURRENT_IP"

# Check if backend is running
if ! curl -s http://localhost:8001/docs > /dev/null; then
  echo "Backend server is not running! Starting it now..."
  
  # Start the backend server
  cd "$(dirname "$0")/niura-backend"
  ./run.sh &
  BACKEND_PID=$!
  
  # Wait for backend to start
  echo "Waiting for backend to start..."
  while ! curl -s http://localhost:8001/docs > /dev/null; do
    sleep 1
    echo -n "."
  done
  echo " Backend started!"
  cd ..
else
  echo "Backend server is already running"
fi

echo "Updating src/services/api.ts with this IP address..."

# Update the API_URL in api.ts
sed -i '' "s|const API_URL = '[^']*'|const API_URL = 'http://$CURRENT_IP:8001'|" src/services/api.ts

echo "Done! API URL updated to: http://$CURRENT_IP:8001"
echo ""
echo "✅ Your app is ready to use!"
echo "----------------------------------------"
echo "1. Test your connection: curl http://$CURRENT_IP:8001/docs"
echo "2. Reload your app (press 'r' in Metro terminal)"
echo "3. Make sure your phone is on the same WiFi network"
echo "----------------------------------------"
echo "Run this script again if you change WiFi networks" 