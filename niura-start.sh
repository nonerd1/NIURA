#!/bin/bash

# NIURA Complete Development Environment Startup
# This script handles everything: IP detection, backend, and frontend startup

echo "
███╗   ██╗██╗██╗   ██╗██████╗  █████╗ 
████╗  ██║██║██║   ██║██████╔╝███████║
██╔██╗ ██║██║██║   ██║██████╔╝███████║
██║╚██╗██║██║██║   ██║██╔══██╗██╔══██║
██║ ╚████║██║╚██████╔╝██║  ██║██║  ██║
╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝

🚀 NIURA Complete Development Environment
==========================================
"

# Global variables
BACKEND_PID=""
FRONTEND_PID=""
BACKEND_STARTED=false
FRONTEND_STARTED=false

# Function to detect IP address
detect_ip() {
    echo "🔍 Detecting network IP address..."
    CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    
    if [ -z "$CURRENT_IP" ]; then
        echo "❌ Could not detect IP address. Please check your network connection."
        exit 1
    fi
    
    echo "✅ Current IP detected: $CURRENT_IP"
}

# Function to update frontend configuration
update_frontend_config() {
    echo "🔧 Updating frontend API configuration..."
    if [ -f "src/config/amplify.ts" ]; then
        sed -i '' "s|baseURL: 'http://[^']*'|baseURL: 'http://$CURRENT_IP:8000/api'|" src/config/amplify.ts
        echo "✅ Frontend configured to use: http://$CURRENT_IP:8000/api"
    else
        echo "⚠️  Frontend config file not found, but continuing..."
    fi
}

# Function to clean up existing processes
cleanup_existing() {
    echo "🧹 Cleaning up existing processes..."
    
    # Kill uvicorn processes more thoroughly
    pkill -9 -f uvicorn 2>/dev/null
    pkill -f "react-native start" 2>/dev/null
    pkill -f "expo start" 2>/dev/null
    
    # Kill any process using port 8000
    PORT_PID=$(lsof -ti:8000 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo "🔧 Killing process using port 8000 (PID: $PORT_PID)..."
        kill -9 $PORT_PID 2>/dev/null
    fi
    
    sleep 3  # Give more time for cleanup
    echo "✅ Cleanup complete"
}

# Function to check if port is available
check_port_available() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Port $port is still in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Function to start backend
start_backend() {
    echo "🔧 Starting backend server..."
    
    # Double-check port availability
    if ! check_port_available 8000; then
        echo "❌ Port 8000 is not available. Trying to free it up..."
        PORT_PID=$(lsof -ti:8000 2>/dev/null)
        if [ -n "$PORT_PID" ]; then
            kill -9 $PORT_PID 2>/dev/null
            sleep 2
        fi
        
        if ! check_port_available 8000; then
            echo "❌ Unable to free port 8000. Please restart your terminal and try again."
            return 1
        fi
    fi
    
    if [ -d "EarBud-BE" ]; then
        echo "✅ Found EarBud-BE backend directory"
        cd EarBud-BE
        
        # Check for virtual environment
        if [ -d "venv" ]; then
            source venv/bin/activate
            echo "✅ Virtual environment activated"
        else
            echo "⚠️  No virtual environment found in EarBud-BE"
        fi
        
        # Start backend with correct module path
        echo "🚀 Starting backend on all interfaces (0.0.0.0:8000)..."
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
        BACKEND_PID=$!
        cd ..
        
        # Wait a moment and check if backend started successfully
        sleep 2
        if kill -0 $BACKEND_PID 2>/dev/null; then
            BACKEND_STARTED=true
            echo "✅ Backend server started successfully (PID: $BACKEND_PID)"
            echo "   - Local access: http://localhost:8000"
            echo "   - Phone access: http://$CURRENT_IP:8000"
            echo "   - API docs: http://$CURRENT_IP:8000/docs"
        else
            echo "❌ Backend failed to start"
            BACKEND_STARTED=false
            return 1
        fi
    else
        echo "❌ EarBud-BE directory not found!"
        echo "   Please ensure your backend is in the EarBud-BE folder"
        BACKEND_STARTED=false
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo "🔧 Starting frontend server..."
    echo "🚀 Starting Expo with tunnel mode for phone access..."
    npx expo start --tunnel &
    FRONTEND_PID=$!
    FRONTEND_STARTED=true
    echo "✅ Frontend server started (PID: $FRONTEND_PID)"
}

# Function to handle cleanup on exit
cleanup_on_exit() {
    echo ""
    echo "🛑 Shutting down NIURA development environment..."
    
    if [ "$BACKEND_STARTED" = true ] && [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null && echo "   ✅ Backend stopped"
    fi
    
    if [ "$FRONTEND_STARTED" = true ] && [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null && echo "   ✅ Frontend stopped"
    fi
    
    echo "👋 NIURA development environment stopped"
    exit 0
}

# Function to test backend connectivity
test_backend() {
    echo "🧪 Testing backend connectivity..."
    sleep 3
    
    # Test if backend responds
    if curl -s --max-time 5 http://localhost:8000/docs > /dev/null 2>&1; then
        echo "✅ Backend responding on localhost"
    else
        echo "⚠️  Backend not responding on localhost"
    fi
    
    # Test external IP access
    if curl -s --max-time 5 http://$CURRENT_IP:8000/docs > /dev/null 2>&1; then
        echo "✅ Backend accessible from phone IP: $CURRENT_IP:8000"
    else
        echo "⚠️  Backend not accessible from external IP"
    fi
}

# Function to display final status
show_final_status() {
    echo ""
    echo "================================================="
    echo "🎉 NIURA Development Environment Active!"
    echo "================================================="
    echo ""
    
    if [ "$BACKEND_STARTED" = true ]; then
        echo "🔧 BACKEND STATUS: ✅ Running"
        echo "   - Local: http://localhost:8000"
        echo "   - Phone: http://$CURRENT_IP:8000"
        echo "   - Docs:  http://$CURRENT_IP:8000/docs"
    else
        echo "🔧 BACKEND STATUS: ❌ Failed to start"
    fi
    
    echo ""
    if [ "$FRONTEND_STARTED" = true ]; then
        echo "📱 FRONTEND STATUS: ✅ Running (Expo Tunnel)"
        echo "   - Check terminal output above for QR code"
        echo "   - App will connect to: $CURRENT_IP:8000"
    else
        echo "📱 FRONTEND STATUS: ❌ Failed to start"
    fi
    
    echo ""
    echo "📋 TESTING INSTRUCTIONS:"
    echo "1. 📱 Test backend from phone browser:"
    echo "   → http://$CURRENT_IP:8000/docs"
    echo ""
    echo "2. 📱 Test NIURA app:"
    echo "   → Open NIURA app on your phone"
    echo "   → Try login/register"
    echo "   → Network errors should be gone!"
    echo ""
    echo "🛑 To stop everything: Press Ctrl+C"
    echo "================================================="
}

# Main execution flow
main() {
    # Set up cleanup trap
    trap cleanup_on_exit SIGINT SIGTERM
    
    # Step 1: Detect IP
    detect_ip
    
    # Step 2: Update frontend config
    update_frontend_config
    
    # Step 3: Clean up existing processes
    cleanup_existing
    
    # Step 4: Start backend
    if ! start_backend; then
        echo "❌ Failed to start backend. Exiting..."
        exit 1
    fi
    
    # Step 5: Start frontend
    start_frontend
    
    # Step 6: Test connectivity
    test_backend
    
    # Step 7: Show status
    show_final_status
    
    # Step 8: Wait for user interrupt
    echo "🔄 Monitoring services... (Press Ctrl+C to stop)"
    wait
}

# Run main function
main 