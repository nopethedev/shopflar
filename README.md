# Shopflar — Self-Hostable Ecommerce Platform

A complete, production-style ecommerce platform inspired by Shopify/PrestaShop, built with Next.js. Features a modern storefront, full admin dashboard, payment abstraction (Stripe + PayPal), Printify integration, and customizable appearance — all from a single codebase you can self-host.

---

## Table of Contents

1. [Requirements](#1-requirements)
2. [Installation](#2-installation)
3. [Environment Variables](#3-environment-variables)
4. [Supabase Setup](#4-supabase-setup)
5. [Database Setup](#5-database-setup)
6. [Supabase RLS Setup](#6-supabase-rls-setup)
7. [Storage Setup](#7-storage-setup)
8. [Stripe Setup](#8-stripe-setup)
9. [PayPal Setup](#9-paypal-setup)
10. [Printify Setup](#10-printify-setup)
11. [Running Locally](#11-running-locally)
12. [Production Deployment](#12-production-deployment)
13. [Creating the First Admin](#13-creating-the-first-admin)
14. [Database Migrations](#14-database-migrations)
15. [Seeding Demo Data](#15-seeding-demo-data)

---

## 1. Requirements

- **Node.js** 18+ (or Bun — recommended)
- **Database**: SQLite (default for local dev) or PostgreSQL/Supabase (production)
- A Stripe account (optional — for card payments)
- A PayPal Business account (optional — for PayPal payments)
- A Printify account (optional — for print-on-demand fulfillment)

---

## 2. Installation

```bash
# Clone the repository
git clone <your-repo-url> shopflar
cd shopflar

# Install dependencies (Bun recommended)
bun install

# Copy environment template
cp .env.example .env

# Edit .env with your values (see section 3)

# Set up the database (see section 5)
bun run db:push

# Seed demo data (see section 15)
bun run db:seed

# Start the dev server
bun run dev
```

Visit `http://localhost:3000` to view the storefront and `http://localhost:3000/admin` for the admin panel.

---

## 3. Environment Variables

All variables are documented in `.env.example`. Key groups:

| Group | Variables | Purpose |
|-------|-----------|---------|
| Database | `DATABASE_URL` | SQLite file path or PostgreSQL URL |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth, storage (production) |
| Auth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | JWT signing |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Card payments |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID` | PayPal payments |
| Printify | `PRINTIFY_API_KEY` | Print-on-demand |
| App | `NODE_ENV`, `APP_URL`, `NEXT_PUBLIC_APP_URL` | Runtime config |

**Security:** Never commit your `.env` file. Never expose secret keys (`STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `PRINTIFY_API_KEY`) to the browser — they are only read in server-side code.

---

## 4. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Navigate to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)
3. Navigate to **Settings → Database → Connection string** and copy the PostgreSQL URL → `DATABASE_URL`
4. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"  // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
5. Run `bun run db:push` to create the schema on Supabase

---

## 5. Database Setup

The platform uses Prisma ORM. The schema is in `prisma/schema.prisma`.

### Local development (SQLite)

The default. No external setup required.

```bash
bun run db:push      # Create tables
bun run db:seed      # Seed demo data
```

### Production (PostgreSQL / Supabase)

1. Update the datasource provider in `prisma/schema.prisma` (see section 4)
2. Set `DATABASE_URL` to your Postgres connection string
3. Run:
   ```bash
   bun run db:push
   bun run db:seed   # optional, for demo data
   ```

---

## 6. Supabase RLS Setup

Row Level Security is enforced by Supabase directly. The platform uses Prisma with the service role key (server-side only), which bypasses RLS — appropriate for an admin-controlled backend.

For customer-facing access (if you choose to expose Supabase directly), apply these policies:

```sql
-- Example policies — adjust to your needs
alter table "products" enable row level security;
create policy "public can view published products"
  on "products" for select using (status = 'PUBLISHED');

alter table "orders" enable row level security;
create policy "users see own orders"
  on "orders" for select using (auth.uid() = "userId" or "userId" is null and email = current_setting('request.jwt.claims', true)::json->>'email');

alter table "addresses" enable row level security;
create policy "users manage own addresses"
  on "addresses" for all using (auth.uid() = "userId");
```

The service role key (used server-side) bypasses RLS. Never expose it to the browser.

---

## 7. Storage Setup

Image uploads currently accept URLs. To enable file uploads to Supabase Storage:

1. Create a bucket named `product-images` (public read, authenticated write)
2. Update the product editor to use the Supabase storage client
3. Policies:
   ```sql
   create policy "authenticated can upload" on storage.objects
     for insert to authenticated
     with check (bucket_id = 'product-images');
   create policy "public read" on storage.objects
     for select to public
     using (bucket_id = 'product-images');
   ```

---

## 8. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys):
   - `STRIPE_SECRET_KEY` (server-side, never expose)
   - `STRIPE_PUBLISHABLE_KEY` (safe for browser)
3. Create a webhook endpoint:
   - URL: `https://yourdomain.com/api/payments/webhook/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`
4. For local testing: `stripe listen --forward-to localhost:3000/api/payments/webhook/stripe`
5. In the admin panel → **Payments**, enable Stripe

The server always verifies payment status with Stripe — never trusts client-sent payment success.

---

## 9. PayPal Setup

1. Create a PayPal Business account at [paypal.com](https://paypal.com)
2. Create a REST app at the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox):
   - Copy **Client ID** → `PAYPAL_CLIENT_ID`
   - Copy **Secret** → `PAYPAL_CLIENT_SECRET`
3. Create a webhook:
   - URL: `https://yourdomain.com/api/payments/webhook/paypal`
   - Events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`
   - Copy the webhook ID → `PAYPAL_WEBHOOK_ID`
4. Set `PAYPAL_MODE=sandbox` for testing, `live` for production
5. In the admin panel → **Payments**, enable PayPal

Server-side verification is performed via PayPal's Orders API before any order is marked as paid.

---

## 10. Printify Setup

1. Create a Printify account at [printify.com](https://printify.com)
2. Generate an API key at **Account → Settings → API**
3. Set `PRINTIFY_API_KEY` in your `.env`
4. Restart the server
5. In the admin panel → **Printify**, click **Sync Shops** to import your Printify shops
6. Use **Import Products** to pull products from a Printify shop into your catalog
7. Linked products can be edited like any other product, and orders containing Printify-linked items can be sent for fulfillment

Printify integration is abstracted behind `src/lib/printify/client.ts` — the rest of the app never depends on Printify-specific code.

---

## 11. Running Locally

```bash
bun run dev
```

The server runs on `http://localhost:3000`.

Demo accounts (created by the seed script):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@shopflar.dev` | `admin12345` |
| Customer | `customer@example.com` | `customer123` |

---

## 12. Production Deployment

### Build

```bash
bun run build
bun run start
```

### Deploy targets

- **Vercel**: import the repo and deploy. Set environment variables in the Vercel dashboard. Switch database to PostgreSQL/Supabase.
- **Docker**: a typical Dockerfile:
  ```dockerfile
  FROM oven/bun:1 as base
  WORKDIR /app
  COPY package.json bun.lock ./
  RUN bun install --frozen-lockfile --production
  COPY . .
  RUN bun run db:generate
  RUN bun run build
  EXPOSE 3000
  CMD ["bun", "run", "start"]
  ```
- **Self-hosted**: build & run on any Node 18+ server. Reverse proxy with Caddy/Nginx.

### Production checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate a strong `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
- [ ] Switch database to PostgreSQL/Supabase
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production URL
- [ ] Configure Stripe webhooks for production
- [ ] Configure PayPal webhooks for production
- [ ] Run `bun run db:push` on your production database
- [ ] Set up the first admin (see section 13)
- [ ] Configure HTTPS (Caddy/Nginx auto-TLS)

---

## 13. Creating the First Admin

### Option 1: Use the seed script

The seed script creates a super admin automatically:

```bash
bun run db:seed
# Admin login: admin@shopflar.dev / admin12345
```

**Change this password immediately after first login.**

### Option 2: Manually via SQL

```sql
-- Hash a password using the same algorithm (sha256 with static salt):
-- echo -n "ecommerce-static-salt:YOUR_PASSWORD" | sha256sum
INSERT INTO users (id, email, passwordHash, role, name, emailVerified, createdAt, updatedAt)
VALUES (
  lower(hex(randomblob(16))),
  'you@example.com',
  '<sha256-hash-of-your-password>',
  'SUPER_ADMIN',
  'Your Name',
  datetime('now'),
  datetime('now'),
  datetime('now')
);
```

### Option 3: Promote an existing customer

After signing up normally:

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
```

### Managing admins

Once you have a Super Admin, you can create additional admins from **Admin → Users & Admins**. Only Super Admins can manage admin roles.

---

## 14. Database Migrations

The default workflow uses `prisma db push` (fast, dev-friendly). For production migrations:

```bash
# Create a migration from schema changes
bun run db:migrate -- --name your_migration_name

# Apply migrations
bun run db:push

# Reset database (⚠️ destructive)
bun run db:reset
```

Always review generated migrations before applying to production.

---

## 15. Seeding Demo Data

The seed script (`scripts/seed.js`) creates:

- **2 users**: 1 super admin, 1 customer (with saved address)
- **5 categories**: Apparel, T-Shirts, Hoodies, Accessories, Footwear
- **8 demo products**: with images, variants (sizes/colors), tags, and a mix of in-stock, low-stock, and out-of-stock items
- **3 shipping methods**: Standard, Express, International
- **9 tax rates**: US states + international
- **3 discount codes**:
  - `WELCOME10` — 10% off, no minimum
  - `SAVE25` — 25% off, $150 minimum, $75 cap
  - `FREESHIP` — free shipping
- **3 demo orders**: in different statuses
- **3 newsletter subscribers**
- **Full store & appearance settings**

```bash
bun run db:seed
```

Re-running the seed is safe — it uses `upsert` and skips existing records.

---

## Architecture Overview

```
src/
├── app/                    # Next.js App Router pages
│   ├── (storefront)/       # Storefront pages (home, products, cart, checkout, account)
│   ├── admin/              # Admin panel (protected routes)
│   ├── api/                # API routes (REST + webhooks)
│   ├── sitemap.ts          # Dynamic sitemap
│   └── robots.ts           # Robots.txt
├── components/
│   ├── storefront/         # Header, footer, product cards, etc.
│   ├── admin/              # Admin UI components
│   ├── shared/             # Theme provider, toasts
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── auth.ts             # Session-based auth (JWT in cookies)
│   ├── db.ts               # Prisma client
│   ├── settings.ts         # Store/appearance settings (cached)
│   ├── password.ts         # Password hashing (scrypt)
│   ├── validation.ts       # Zod schemas
│   ├── cart-store.ts       # Zustand cart with persistence
│   ├── wishlist-store.ts   # Zustand wishlist
│   ├── payments/           # Payment provider abstraction
│   ├── printify/           # Printify integration
│   └── services/
│       └── orders.ts       # Order creation (server-authoritative)
└── prisma/
    └── schema.prisma       # Database schema (SQLite/PostgreSQL)
```

### Security model

- All admin routes protected via `requireAdmin()` middleware
- Super Admin-only routes via `requireSuperAdmin()`
- Passwords hashed with scrypt (Node built-in, no external deps)
- Sessions are HTTP-only JWT cookies (signed with `NEXTAUTH_SECRET`)
- **Server-side authoritative pricing**: product prices are looked up from the database at checkout — client-sent prices are ignored
- **Server-side payment verification**: Stripe/PayPal statuses are confirmed via their APIs before marking orders as paid
- **Webhook signature verification**: Stripe signatures checked via `stripe.webhooks.constructEvent`; PayPal events verified via their API
- All API inputs validated with Zod
- Secret keys (`STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, `PRINTIFY_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-only — never serialized to client bundles

### Payment provider abstraction

`src/lib/payments/index.ts` defines a `PaymentProvider` interface with three implementations: `StripeProvider`, `PayPalProvider`, and `CODProvider` (cash on delivery — default fallback for demo). Providers can be enabled/disabled from the admin panel; their configuration lives in environment variables.

### Printify abstraction

`src/lib/printify/client.ts` provides a `PrintifyClient` class that wraps Printify's REST API. `src/lib/printify/sync.ts` handles synchronization between local products and Printify products. The rest of the codebase never imports Printify-specific code.

---

## License

MIT
