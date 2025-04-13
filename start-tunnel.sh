#!/bin/bash

echo "Starting NIURA backend and Localtunnel..."
echo "----------------------------------------"

# Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f uvicorn
pkill -f "lt --port"

# Start the backend server if not already running
echo "Checking if backend server is running..."
if ! curl -s http://localhost:8001/docs > /dev/null; then
  echo "Starting backend server..."
  cd "$(dirname "$0")/niura-backend"
  ./run.sh &
  BACKEND_PID=$!
  
  # Wait for backend to start
  echo "Waiting for backend to start..."
  until curl -s http://localhost:8001/docs > /dev/null; do
    sleep 1
  done
  # Return to the project root
  cd ..
else
  echo "Backend server is already running"
fi

# Start localtunnel
echo "Starting localtunnel..."
lt --port 8001 > .tunnel_info &
TUNNEL_PID=$!

# Wait for tunnel to be established
sleep 3

# Extract the URL from the tunnel info
TUNNEL_URL=$(grep -o "https://.*" .tunnel_info | head -n 1 | tr -d '\n\r')
if [ -z "$TUNNEL_URL" ]; then
  echo "Failed to get tunnel URL. Check .tunnel_info file."
  exit 1
fi

echo "Tunnel established at: $TUNNEL_URL"

# Update the API URL in src/services/api.ts
echo "Updating API URL in src/services/api.ts..."
# Get full path to the file to ensure it's found
API_FILE="$(pwd)/src/services/api.ts"
if [ -f "$API_FILE" ]; then
  sed -i '' "s|const API_URL = '[^']*'|const API_URL = '$TUNNEL_URL'|" "$API_FILE"
  echo "API URL updated successfully"
else
  echo "Warning: Could not find $API_FILE"
  echo "You'll need to manually update the API URL in your code"
fi

echo "
----------------------------------------
🚀 NIURA is running!

Backend: http://localhost:8001
Tunnel: $TUNNEL_URL

Your app should now connect through the tunnel URL automatically.
Remember to reload your app (press 'r' in Metro terminal)

To stop the tunnel: kill $TUNNEL_PID
----------------------------------------" 