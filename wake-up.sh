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

echo "Starting NIURA with tunnel mode..."
echo "----------------------------------------"

# Step 1: Get the current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -n 1)
if [ -z "$CURRENT_IP" ]; then
    echo "Could not find network IP, using localhost..."
    CURRENT_IP="127.0.0.1"
fi
echo "Your current IP address is: $CURRENT_IP"

# Step 2: Update the API URL in src/services/api.ts
echo "Updating src/services/api.ts with this IP address..."
sed -i '' "s|const API_URL = '[^']*'|const API_URL = 'http://$CURRENT_IP:8001'|" "$(dirname "$0")/src/services/api.ts"
echo "API URL updated to: http://$CURRENT_IP:8001"

# Step 3: Kill any existing processes
echo "Cleaning up existing processes..."
pkill -f uvicorn
pkill -f "react-native start"

# Step 4: Start the backend server
echo "Starting backend server..."
cd "$(dirname "$0")/niura-backend"
source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
while ! curl -s http://localhost:8001/docs > /dev/null; do
  sleep 1
  echo -n "."
done
echo " Backend started!"

# Step 5: Start the React Native development server with tunnel mode
echo "Starting React Native development server in tunnel mode..."
cd ..
npx expo start --tunnel &
METRO_PID=$!

# Function to handle script termination
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $METRO_PID 2>/dev/null
    exit 0
}

# Set up cleanup on script termination
trap cleanup SIGINT SIGTERM

echo "
----------------------------------------
🚀 NIURA is running!

Backend: http://$CURRENT_IP:8001
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