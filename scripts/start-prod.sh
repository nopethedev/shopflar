#!/usr/bin/env bash
# Production start script — auto-builds if .next doesn't exist
# Usage:
#   ./start-prod.sh                 # builds (if needed) and starts on port 3000
#   PORT=8080 ./start-prod.sh       # builds (if needed) and starts on port 8080

set -e

PORT="${PORT:-3000}"
export PORT
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:$PORT}"
export APP_URL="${APP_URL:-$NEXT_PUBLIC_APP_URL}"

# Detect package manager
PM="npm"
if command -v bun >/dev/null 2>&1; then PM="bun"; fi

# Auto-build if .next doesn't exist or is stale
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
  echo "→ Building the app (first run or .next missing)..."
  $PM run build
else
  echo "→ Found existing build (.next/BUILD_ID exists)"
fi

echo "→ Starting production server on port $PORT..."
echo "→ App URL: $NEXT_PUBLIC_APP_URL"
echo ""
$PM run start
