#!/bin/bash
# Wiring Audit Phase 1: Extract all routes and find inbound references
# Outputs: scripts/wiring-audit-results.json

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
OUTPUT="$PROJECT_ROOT/scripts/wiring-audit-results.json"

echo "=== ChefFlow Wiring Audit ==="
echo "Extracting routes from app/ directory..."

# Phase 1: Extract all page routes from Next.js app directory
# Convert file paths to URL routes
routes=()
while IFS= read -r file; do
  # Remove app dir prefix and /page.tsx suffix
  route="${file#$APP_DIR}"
  route="${route%/page.tsx}"

  # Remove route group markers (chef), (public), (admin)
  route=$(echo "$route" | sed 's|/([^)]*)||g')

  # Skip empty (root page)
  if [ -z "$route" ]; then
    route="/"
  fi

  routes+=("$route")
done < <(find "$APP_DIR" -name "page.tsx" -type f | sort)

echo "Found ${#routes[@]} routes"

# Phase 2: For each route, count inbound references across codebase
# Search .tsx, .ts files for href, Link, redirect, push references
echo "Scanning for inbound links..."
echo "{" > "$OUTPUT"
echo '  "generated": "'$(date -Iseconds)'",' >> "$OUTPUT"
echo '  "total_routes": '${#routes[@]}',' >> "$OUTPUT"
echo '  "routes": [' >> "$OUTPUT"

count=0
orphans=0
total=${#routes[@]}

for route in "${routes[@]}"; do
  count=$((count + 1))

  # Skip dynamic routes for direct matching - we'll pattern match them
  # e.g., /events/[id] -> search for /events/ patterns

  # Build search pattern - escape special chars but handle [param] segments
  # For static routes: exact match
  # For dynamic routes like /events/[id]: search for /events/ prefix

  search_route="$route"
  is_dynamic=false

  if echo "$route" | grep -q '\['; then
    is_dynamic=true
    # Get the static prefix before first dynamic segment
    search_route=$(echo "$route" | sed 's|\[.*||' | sed 's|/$||')
  fi

  # Skip if search route is empty or just /
  if [ -z "$search_route" ] || [ "$search_route" = "/" ]; then
    # Root route - skip (always wired)
    if [ $count -lt $total ]; then
      echo "    {\"route\": \"$route\", \"refs\": -1, \"status\": \"SKIP\", \"dynamic\": $is_dynamic}," >> "$OUTPUT"
    else
      echo "    {\"route\": \"$route\", \"refs\": -1, \"status\": \"SKIP\", \"dynamic\": $is_dynamic}" >> "$OUTPUT"
    fi
    continue
  fi

  # Count references in .ts/.tsx files (excluding the page itself and node_modules)
  ref_count=$(grep -r --include="*.tsx" --include="*.ts" \
    -l "$search_route" "$PROJECT_ROOT/app" "$PROJECT_ROOT/components" "$PROJECT_ROOT/lib" 2>/dev/null | \
    grep -v "page.tsx$" | \
    wc -l || echo "0")

  # Trim whitespace
  ref_count=$(echo "$ref_count" | tr -d ' ')

  # Also check nav configs specifically
  nav_ref=$(grep -c "$search_route" "$PROJECT_ROOT/components/navigation/"*.ts "$PROJECT_ROOT/components/navigation/"*.tsx 2>/dev/null || echo "0")
  nav_ref=$(echo "$nav_ref" | tr -d ' ')

  status="WIRED"
  if [ "$ref_count" -eq 0 ]; then
    status="ORPHAN"
    orphans=$((orphans + 1))
  elif [ "$ref_count" -le 1 ]; then
    status="WEAK"
  fi

  # Progress indicator
  if [ $((count % 50)) -eq 0 ]; then
    echo "  Progress: $count/$total (orphans so far: $orphans)"
  fi

  comma=","
  if [ $count -eq $total ]; then
    comma=""
  fi

  echo "    {\"route\": \"$route\", \"refs\": $ref_count, \"nav_refs\": $nav_ref, \"status\": \"$status\", \"dynamic\": $is_dynamic}$comma" >> "$OUTPUT"
done

echo '  ],' >> "$OUTPUT"
echo '  "summary": {' >> "$OUTPUT"
echo '    "total": '$total',' >> "$OUTPUT"
echo '    "orphans": '$orphans >> "$OUTPUT"
echo '  }' >> "$OUTPUT"
echo '}' >> "$OUTPUT"

echo ""
echo "=== COMPLETE ==="
echo "Total routes: $total"
echo "Candidate orphans (0 refs): $orphans"
echo "Results: $OUTPUT"
