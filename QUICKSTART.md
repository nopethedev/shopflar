# Shopflar — Quick Start

The fastest way to get Shopflar running locally:

## Option A: Use the start script

**Mac/Linux:**
```bash
./start.sh
npm run dev    # or: bun run dev
```

**Windows:**
```bat
start.bat
npm run dev
```

The script automatically installs dependencies, creates the database, and seeds demo data.

## Option B: Manual setup

```bash
# 1. Install dependencies (Bun recommended, npm works too)
npm install          # or: bun install

# 2. Generate Prisma client + create SQLite database
npm run db:generate
npm run db:push

# 3. Seed demo data (creates products, categories, admin user, etc.)
npm run db:seed

# 4. Start the dev server
npm run dev          # or: bun run dev
```

## Open the app

- **Storefront**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@shopflar.dev` | `admin12345` |
| Customer | `customer@example.com` | `customer123` |

## Try the discount codes

- `WELCOME10` — 10% off, no minimum
- `SAVE25` — 25% off, $150 min (capped at $75)
- `FREESHIP` — Free shipping

## Changing the port

The dev server runs on port 3000 by default. To use a different port:

**Mac/Linux:**
```bash
PORT=8080 npm run dev
```

**Windows (cmd):**
```bat
set PORT=8080
npm run dev
```

**Windows (PowerShell):**
```powershell
$env:PORT=8080; npm run dev
```

For production:
```bash
PORT=8080 npm run start
```

## Configuring payment providers (Stripe, PayPal)

You have **two ways** to configure payment credentials:

### 1. From the admin panel (recommended)

1. Log in to `/admin` (admin@shopflar.dev / admin12345)
2. Navigate to **Payments** in the sidebar
3. Enter your API keys in the form fields
4. Toggle the provider on
5. Click **Save Credentials**

The credentials are stored in the database (server-side only). Secret keys are never exposed to the browser.

### 2. From `.env` file

Edit `.env` and add your credentials:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # or 'live'
```

DB credentials take precedence over env vars — you can use either or both.

## PayPal personal account support (IPN)

If you're using a PayPal personal/premier account (not a business account with REST API access), use PayPal IPN:

1. Log in to your PayPal account
2. Go to **Profile → My Selling Tools → Instant Payment Notifications**
3. Set the notification URL to: `https://yourdomain.com/api/payments/webhook/paypal/ipn`
4. Enable IPN
5. In the admin panel → Payments → PayPal, paste the same URL in the "IPN Notification URL" field

The IPN listener verifies each notification with PayPal before marking orders as paid — server-side, never trusting the browser.

## Setting the public App URL

The App URL is used for sitemap.xml, robots.txt, and absolute links in emails.

**From the admin panel:**
1. Go to **Admin → Payments → Application URL**
2. Enter your public URL (e.g., `https://myshop.com`)
3. Click **Save**

This takes effect immediately — no rebuild needed.

**From `.env` (alternative):**
```bash
APP_URL=https://myshop.com
NEXT_PUBLIC_APP_URL=https://myshop.com
```

## What's already working

- Browse the storefront, add products to cart, checkout with Cash on Delivery
- Admin dashboard with revenue chart, recent orders, low-stock alerts
- Full product editor with 8 tabs (general, images, pricing, inventory, variants, categories, SEO, shipping)
- Appearance editor — change colors, hero image, fonts, social links live
- Newsletter, shipping, tax, discount management
- Customer accounts with order history & saved addresses
- PayPal IPN listener (for personal account support)

## What's optional (needs API keys)

- **Stripe** — add credentials via Admin → Payments (or `.env`)
- **PayPal REST API** — add credentials via Admin → Payments (or `.env`)
- **PayPal IPN** — for personal accounts; configure URL in PayPal profile + admin panel
- **Printify** — add `PRINTIFY_API_KEY` to `.env` (DB-backed coming soon)
- **Supabase** — for production; switch Prisma provider to `postgresql` and set `DATABASE_URL`

See `README.md` for full documentation on each integration.

## Requirements

- Node.js 18+ (or Bun — recommended, faster)
- That's it. SQLite is bundled, no external database needed for local dev.

## Production deployment

See `README.md` → "Production Deployment" section for Vercel/Docker/self-hosted instructions.
