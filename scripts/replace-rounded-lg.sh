#!/bin/bash
# Script to replace all rounded-lg with rounded-xl in tsx files under src/

echo "Counting files with rounded-lg..."
files_count=$(grep -rl "rounded-lg" /workspaces/jbalwikobra.com-digid/src --include="*.tsx" 2>/dev/null | wc -l)
echo "Found $files_count files with rounded-lg"

echo ""
echo "Counting total occurrences..."
total_count=$(grep -r "rounded-lg" /workspaces/jbalwikobra.com-digid/src --include="*.tsx" 2>/dev/null | wc -l)
echo "Found $total_count occurrences"

echo ""
echo "Performing replacement..."
find /workspaces/jbalwikobra.com-digid/src -name "*.tsx" -type f -exec sed -i 's/rounded-lg/rounded-xl/g' {} \;

echo ""
echo "Verifying... (should be 0)"
remaining=$(grep -r "rounded-lg" /workspaces/jbalwikobra.com-digid/src --include="*.tsx" 2>/dev/null | wc -l)
echo "Remaining occurrences: $remaining"

echo ""
echo "Summary:"
echo "- Files modified: $files_count"
echo "- Total replacements: $total_count"
