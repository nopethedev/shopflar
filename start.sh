#!/usr/bin/env bash
# Quick start script for Shopflar
# Customizable via environment variables:
#   PORT            - dev server port (default 3000)
#   APP_URL         - public URL (default http://localhost:$PORT)
#   NEXTAUTH_SECRET - JWT signing secret (auto-generated if missing)
#
# Usage:
#   ./start.sh                # sets up + runs dev server on port 3000
#   PORT=8080 ./start.sh      # uses port 8080
#   PORT=8080 APP_URL=https://shop.local ./start.sh

set -e

echo "=========================================="
echo "  Shopflar - Quick Start"
echo "=========================================="

# Resolve port with default
PORT="${PORT:-3000}"
echo "→ Port: $PORT"

# Auto-set APP_URL if not provided
if [ -z "$APP_URL" ]; then
  APP_URL="http://localhost:$PORT"
fi
export APP_URL
export NEXT_PUBLIC_APP_URL="$APP_URL"
echo "→ App URL: $APP_URL"

# Run setup (installs deps, creates DB, generates Prisma client)
# setup.js handles NEXTAUTH_SECRET auto-generation and .env creation
node scripts/setup.js

echo ""
echo "=========================================="
echo "  Starting dev server on port $PORT"
echo "=========================================="
echo ""
echo "  First-time? Open $APP_URL/install to set up"
echo "  your admin account and (optionally) load demo data."
echo ""
echo "  Already installed? Open $APP_URL/admin"
echo ""

# Detect package manager
PM="npm"
if command -v bun >/dev/null 2>&1; then
  PM="bun"
fi

# Start dev server with custom port
exec $PM run dev
