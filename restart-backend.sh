#!/bin/bash

echo "Restarting NIURA backend server..."

# Kill existing backend process
echo "Stopping current backend..."
pkill -f uvicorn

# Start the backend server
echo "Starting backend server with updated CORS settings..."
cd "$(dirname "$0")/niura-backend"
./run.sh &

echo "Backend restarted! Your ngrok connection should now work."
echo "Try logging in again on your app." 