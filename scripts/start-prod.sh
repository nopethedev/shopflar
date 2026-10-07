#!/usr/bin/env bash
# Production start script — auto-builds if .next doesn't exist
# Usage:
#   ./scripts/start-prod.sh                          # builds (if needed) and starts on 0.0.0.0:3000
#   PORT=8080 ./scripts/start-prod.sh                # builds (if needed) and starts on 0.0.0.0:8080
#   PORT=8080 HOST=127.0.0.1 ./scripts/start-prod.sh # localhost only

set -e

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
export PORT HOST
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

echo "→ Starting production server on $HOST:$PORT..."
echo "→ App URL: $NEXT_PUBLIC_APP_URL"
echo ""
$PM run start
