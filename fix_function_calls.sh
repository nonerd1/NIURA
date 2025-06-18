#!/bin/bash

echo "=== FIXING FUNCTION CALL ISSUES ==="
echo "Correcting token.unit back to token.unit() where it should be a function call"

# Function to fix token.unit back to token.unit()
fix_token_unit_calls() {
    local file="$1"
    echo "Fixing token.unit calls in: $file"
    
    # Replace token.unit with token.unit() (but not if it's already token.unit())
    sed -i '' 's/token\.unit\([^()]\)/token.unit()\1/g' "$file"
    
    echo "Fixed: $file"
}

# Find files that might have this issue
echo "Searching for files with token.unit calls..."

find . -name "*.h" -o -name "*.cpp" | xargs grep -l "token\.unit[^()]" 2>/dev/null | while read file; do
    fix_token_unit_calls "$file"
done

echo "=== DONE ==="
echo "Function call issues should now be fixed!" 