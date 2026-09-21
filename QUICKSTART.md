# Shopflar — Quick Start

The fastest way to get Shopflar running locally:

## Option A: Use the start script (recommended)

**Mac/Linux:**
```bash
./start.sh
```

**Windows:**
```bat
start.bat
```

The script:
1. Installs dependencies (uses `npm` or `bun` if available)
2. Generates a `NEXTAUTH_SECRET` and saves it to `.env` if missing
3. Creates the SQLite database and tables
4. Starts the dev server on port 3000

When the server starts, open **http://localhost:3000** — you'll be redirected to `/install` automatically on first run.

## Option B: Manual setup

```bash
# 1. Install dependencies (Bun or npm both work)
npm install

# 2. One-time setup (creates DB, generates Prisma client)
npm run setup

# 3. Start the dev server
npm run dev
```

## First-run install wizard

On first visit, you'll be sent to **/install** — a 3-step wizard:
1. **Store info** — name, contact email, currency
2. **Admin account** — your admin email and password (Super Admin role)
3. **Demo data** — opt in to load sample products, categories, discounts, shipping, tax, and orders

The wizard:
- Creates your admin user (Super Admin role)
- Saves your store settings
- Optionally loads demo products, categories, discounts, etc.
- Logs you in automatically
- Redirects you to `/admin`

You only see the wizard once. If you ever want to reset, delete `db/custom.db` and restart.

## Custom port

Set `PORT` before running:

**Mac/Linux:**
```bash
PORT=8080 ./start.sh           # or: PORT=8080 npm run dev
```

**Windows (cmd):**
```bat
set PORT=8080
start.bat
```

**Windows (PowerShell):**
```powershell
$env:PORT=8080; npm run dev
```

## Production (no manual build needed)

```bash
./scripts/start-prod.sh           # Mac/Linux — auto-builds if .next is missing
# Or:
npm run build && npm run start
```

The `start-prod.sh` script checks if `.next` exists; if not, it runs `npm run build` automatically, then starts the production server.

## Switching databases (SQLite → MySQL/MariaDB → PostgreSQL)

Shopflar ships with SQLite for zero-config local dev. To switch to MySQL/MariaDB or PostgreSQL:

```bash
npm run switch-db mysql          # for MySQL or MariaDB
npm run switch-db postgres      # for PostgreSQL or Supabase
npm run switch-db sqlite        # back to default
```

The script will:
1. Ask for your connection string (or read from `DATABASE_URL` env var)
2. Update `prisma/schema.prisma` (changes the `provider`)
3. Update `.env` (the `DATABASE_URL`)
4. Optionally run `prisma generate` and `prisma db push` immediately

Example for MariaDB:
```bash
DATABASE_URL="mysql://root:password@localhost:3306/shopflar" npm run switch-db mysql
```

**MariaDB setup:**
```bash
# Install MariaDB if needed, then create the database:
mysql -u root -p -e "CREATE DATABASE shopflar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'shopflar'@'localhost' IDENTIFIED BY 'yourpassword';"
mysql -u root -p -e "GRANT ALL ON shopflar.* TO 'shopflar'@'localhost';"

# Switch and push schema:
DATABASE_URL="mysql://shopflar:yourpassword@localhost:3306/shopflar" npm run switch-db mysql
```

## Demo accounts (only created by install wizard or seed script)

If you skipped the wizard and ran `npm run db:seed` instead:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@shopflar.dev` | `admin12345` |
| Customer | `customer@example.com` | `customer123` |

If you used the install wizard, use whatever email/password you set up.

## Try the discount codes (if demo data loaded)

- `WELCOME10` — 10% off, no minimum
- `FREESHIP` — Free shipping

## Configuring payment providers

### From the admin panel (recommended)

1. Log in to `/admin`
2. Navigate to **Payments** in the sidebar
3. Choose your provider:
   - **Stripe** — enter Secret Key + Publishable Key (REST API)
   - **PayPal** — enter Client ID + Secret (REST API, for business accounts)
   - **PayPal Standard** — enter just your **PayPal email** (for personal accounts, uses IPN)
   - **Cash on Delivery** — toggle on, no configuration needed
4. Toggle the provider on
5. Click **Save Credentials**

### PayPal Standard (personal account — simplest)

Just enter your PayPal email in **Admin → Payments → PayPal Standard**. That's it. No API credentials, no REST app, no client ID/secret.

How it works:
1. Customer chooses PayPal at checkout
2. They're redirected to PayPal's hosted payment page (paypal.com)
3. They pay with their PayPal account or card
4. PayPal sends an IPN to `/api/payments/webhook/paypal/ipn`
5. The server verifies the IPN by sending it back to PayPal
6. If PayPal says "VERIFIED", the order is marked as paid (server-side)

**To enable IPN:**
- In your PayPal account: Profile → My Selling Tools → Instant Payment Notifications → Update → Enable
- Set the URL to: `https://yourdomain.com/api/payments/webhook/paypal/ipn`
- The admin panel will show you the exact URL to paste

### From `.env` file (alternative)

You can also set credentials in `.env`. DB credentials take precedence over env vars.

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Or for PayPal Standard (personal):
PAYPAL_EMAIL=you@example.com
PAYPAL_MODE=sandbox  # or 'live'
```

## Setting the public App URL

The App URL is used for sitemap.xml, robots.txt, and absolute links.

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

## Requirements

- Node.js 18+ (or Bun — recommended, faster)
- That's it. SQLite is bundled, no external database needed for local dev.
- For production: MySQL/MariaDB, PostgreSQL, or Supabase (use `npm run switch-db`)

## Need help?

See `README.md` for full documentation on each integration.
