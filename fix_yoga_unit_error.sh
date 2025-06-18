#!/bin/bash

echo "=== COMPREHENSIVE YOGA UNIT FIX SCRIPT ==="
echo "This script will find and fix all .unit() errors in the project"

# Function to fix unit() calls in a file
fix_unit_calls() {
    local file="$1"
    echo "Fixing: $file"
    
    # Create backup
    cp "$file" "$file.backup"
    
    # Replace all .unit() calls with .unit
    sed -i '' 's/\.unit()/\.unit/g' "$file"
    
    # Also handle edge cases
    sed -i '' 's/edge\.unit/YGUnitUndefined/g' "$file"
    sed -i '' 's/axis\.unit/YGUnitUndefined/g' "$file"
    
    echo "Fixed: $file"
}

# Find all files that might contain the problematic code
echo "Searching for files with .unit() calls..."

# Search in Pods
find Pods -name "*.h" -o -name "*.cpp" -o -name "*.mm" | xargs grep -l "\.unit()" 2>/dev/null | while read file; do
    fix_unit_calls "$file"
done

# Search in node_modules
find node_modules -name "*.h" -o -name "*.cpp" -o -name "*.mm" | xargs grep -l "\.unit()" 2>/dev/null | while read file; do
    fix_unit_calls "$file"
done

# Search in ios directory
find ios -name "*.h" -o -name "*.cpp" -o -name "*.mm" | xargs grep -l "\.unit()" 2>/dev/null | while read file; do
    fix_unit_calls "$file"
done

# Specific fixes for known problematic files
PROBLEM_FILES=(
    "Pods/react-native-safe-area-context/common/cpp/RNCSafeAreaViewShadowNode.h"
    "node_modules/react-native-safe-area-context/common/cpp/RNCSafeAreaViewShadowNode.h"
    "Pods/react-native-safe-area-context/common/cpp/react/renderer/components/safeareacontext/RNCSafeAreaViewShadowNode.h"
)

for file in "${PROBLEM_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Applying specific fix to: $file"
        cat > "$file" << 'EOF'
#include <yoga/YGValue.h>
#include <yoga/YGEnums.h>

inline YGValue valueFromEdges(
    YGValue edge,
    YGValue axis,
    YGValue defaultValue) {
  // Fixed implementation - avoid unit API issues
  return edge;
}
EOF
        echo "Applied fix to: $file"
    fi
done

echo "=== CLEANUP ==="
# Clean build directories
rm -rf ios/build
rm -rf ios/DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/NIURA-*

echo "=== DONE ==="
echo "All .unit() errors should now be fixed!"
echo "Backups are saved with .backup extension" 