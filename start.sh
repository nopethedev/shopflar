#!/usr/bin/env bash
# Quick start script for Shopflar
# Customizable via environment variables:
#   PORT            - dev server port (default 3000)
#   APP_URL         - public URL (default http://localhost:$PORT)
#   NEXTAUTH_SECRET - JWT signing secret (auto-generated if missing)
#
# Usage:
#   ./start.sh                   # uses port 3000
#   PORT=8080 ./start.sh         # uses port 8080
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

# Auto-generate NEXTAUTH_SECRET if missing (only writes to .env if absent)
if [ -z "$NEXTAUTH_SECRET" ]; then
  if grep -q '^NEXTAUTH_SECRET=""' .env 2>/dev/null || grep -q '^NEXTAUTH_SECRET=$' .env 2>/dev/null; then
    NEW_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    # Update .env in place
    if command -v sed >/dev/null 2>&1; then
      sed -i.bak "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_SECRET\"|" .env
      rm -f .env.bak
      export NEXTAUTH_SECRET="$NEW_SECRET"
      echo "→ Generated NEXTAUTH_SECRET and saved to .env"
    fi
  fi
fi

# Detect package manager
PM="npm"
if command -v bun >/dev/null 2>&1; then
  PM="bun"
fi
echo "→ Using: $PM"

# Install dependencies
echo ""
echo "[1/4] Installing dependencies..."
$PM install

# Generate Prisma client
echo ""
echo "[2/4] Generating Prisma client..."
$PM run db:generate

# Push schema to SQLite
echo ""
echo "[3/4] Creating database tables..."
$PM run db:push

# Seed demo data
echo ""
echo "[4/4] Seeding demo data..."
$PM run db:seed

echo ""
echo "=========================================="
echo "  ✅ Setup complete!"
echo "=========================================="
echo ""
echo "Port:       $PORT"
echo "App URL:    $APP_URL"
echo ""
echo "Demo accounts:"
echo "  Admin:    admin@shopflar.dev / admin12345"
echo "  Customer: customer@example.com / customer123"
echo ""
echo "Start the dev server with:"
echo "  $PM run dev"
echo ""
echo "Or with a custom port:"
echo "  PORT=8080 $PM run dev"
echo ""
echo "Then open $APP_URL"
echo "Admin panel: $APP_URL/admin"
echo ""
echo "Tip: You can also change credentials and app URL from the admin panel:"
echo "     Admin → Payments (for Stripe/PayPal keys)"
echo "     Admin → Payments → Application URL (for sitemap/SEO URL)"
