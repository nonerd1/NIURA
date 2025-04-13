#!/bin/bash

echo "Testing IP detection and API URL update..."

# Step 1: Get the current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
echo "Your current IP address is: $CURRENT_IP"

# Step 2: Show the current API URL
echo "Current API URL in src/services/api.ts:"
grep "API_URL" src/services/api.ts | head -n 1

# Step 3: Update the API URL in src/services/api.ts
echo "Updating src/services/api.ts with this IP address..."
sed -i '' "s|const API_URL = '[^']*'|const API_URL = 'http://$CURRENT_IP:8001'|" src/services/api.ts

# Step 4: Show the new API URL
echo "New API URL in src/services/api.ts:"
grep "API_URL" src/services/api.ts | head -n 1

echo "Test completed!" 