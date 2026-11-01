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

## 16. Email Verification (Anti-Bot)

New signups must confirm their email address before the account can be used — this keeps bots from mass-creating accounts.

**How it works**

1. A visitor signs up at `/signup` → the account is created **unverified** and a confirmation email with a one-time link is sent.
2. Until the link is clicked, signing in returns *"Please verify your email address first"* with a **Resend** button (resending requires the password, so the endpoint can't be abused to spam strangers).
3. Clicking the link (`/verify-email?token=…`) verifies the account and signs the visitor straight in.
4. Tokens are stored hashed (SHA-256), expire after 24 h and are single-use; emails are rate-limited to one per minute.
5. Accounts created during **checkout** also receive a verification email — the order itself is never blocked.
6. Accounts created by an **admin** (Admin → Users & Admins) are pre-verified automatically.

**Admin controls**

- *Store Settings → Security → "Require email verification"* — turn the whole feature on/off.
- *Users & Admins* — every account shows a **Verified / Unverified** badge with actions: **Resend** the verification email, **Verify** manually, or **Unverify** (blocks sign-in again).
- The email log (Admin → Email & SMTP) shows every verification email that was sent.

> **Note:** if SMTP isn't configured yet (Admin → Email & SMTP), new accounts are verified automatically instead of locking everyone out — the Store Settings page shows a warning about this. Configure SMTP to activate the gate.

**Upgrading an existing store:** the first update run automatically marks all existing users as verified (`scripts/backfill-verify.mjs`), so nobody gets locked out by the new requirement.

---

## 17. Auto Updater

Shopflar can update itself from a release zip — from the admin panel or the terminal — while **keeping everything that makes your install yours**.

**Always preserved during an update**

| Preserved | Why |
| --- | --- |
| `package.json` | Your custom scripts (e.g. `npm run start` with your own port) stay exactly as you wrote them |
| `.env` (all `.env*`) | Your secrets and configuration |
| `db/`, `prisma/*.db` | Your database (schema is migrated with `db:push`, data is kept) |
| **Your DB provider** | If you switched to MySQL/Postgres with `npm run switch-db`, the update keeps `provider = "mysql"/"postgresql"` in `prisma/schema.prisma` |
| `public/uploads/` | Uploaded product images and files |
| `node_modules/`, lockfiles, `.next/`, `logs/` | Build artifacts and caches |

New app files are added, changed files are replaced, and files removed by the new release are deleted (tracked via `updates/manifest.json`).

**Option A — Admin panel (Admin → Updates)**

Two update sources:

- **Pull from GitHub** — enter your repository (`owner/name`) and branch (default `main`), optionally an access token for private repos, then click **Update from GitHub now**. A *Check for updates* button shows the latest commit on the branch.
- **Upload zip** — upload the new `shopflar.zip`.

Then pick options: **Rebuild** (run `npm run build` — needed when your start script runs `next start`), **Apply dependency updates** (refreshes dependency *versions* in your package.json if the release changed them — your scripts are never touched), **Force npm install**.

Click **Start update**. The page shows a live step timeline and log, survives the server restart, and confirms when the store is back up.

**Option B — Terminal**

```bash
# Basic: apply package, run db:push, restart with your own `npm run start`
node scripts/updater.mjs /path/to/shopflar.zip --rebuild

# Update straight from GitHub (private repos: set GITHUB_TOKEN)
GITHUB_TOKEN=github_pat_… node scripts/updater.mjs --github --repo owner/shopflar --branch main --rebuild

# Useful flags
--no-merge-deps   # never touch package.json at all
--no-restart      # apply files + db:push only, you restart manually
--npm-install     # force npm install even if dependencies didn't change
--dry-run         # validate the package without changing anything
```

**What the updater does, in order**

1. Validates the zip (pure Node — no `unzip` binary or extra packages needed)
2. Extracts to `updates/`, skips all preserved paths
3. Removes files that the new release deleted
4. Merges dependency updates into your `package.json` (optional, scripts preserved)
5. `npm install` — only when dependencies actually changed
6. `npm run db:push` — your script, your `DATABASE_URL`
7. One-time backfill: marks existing users email-verified (first update only)
8. `npm run build` (optional)
9. Stops the old server (via the PID written on boot in `updates/server.pid`, with a port-scan fallback) and starts **your** `npm run start`
10. Waits until the server answers, then writes `updates/last-update.json`

Progress and history live in `updates/` (`state.json`, `last-update.json`, `updater-*.log`).

## 18. Notifications (Discord) & Logs

**Admin → Notifications** — connect a Discord webhook and get an embed in your channel for: new orders, payments received, status changes, refunds, auto-fulfillment results, new customers, email verifications, low stock, dice wins and failed emails. Every event can be toggled individually, and a *Send test message* button verifies the setup. Notification failures never break the store — they show up in the logs as `discord.failed`.

**Admin → Logs** — two tabs:

- **Activity** — every order, payment, status change, refund, low-stock alert, customer registration, admin change (products, discounts, users, settings), Discord delivery and more, with searchable details and pagination.
- **Emails** — every email the store attempted, with status (sent/failed) and the exact SMTP error for failures — the first place to look when "a customer says they didn't get an email". Bodies can be previewed inline.

Logs can be filtered, auto-refreshed every 15 s and cleared per tab.

---

## 19. Mystery Boxes

Any product can be turned into a mystery box (Admin → Plugins → Mystery Crates):

- **Guaranteed items** — always included (with per-item quantities)
- **Prize pool** — weighted chance-based items; set how many random picks each box contains
- **Show odds button** — per-crate toggle (in the crate list and the editor). When on, the product page shows a *"What's inside? View the odds"* button that opens a dialog listing the guaranteed items and every pool item with its exact percentage chance (weights converted to %, shown with a bar)

**Reveal experience:** the customer adds the box to the cart, pays, and the order confirmation page shows a *"Mystery box"* section — tap the wiggling box to open it and the won items pop in one by one (guaranteed items are tagged, lucky draws are tagged). Contents are decided server-side at order time (`Order.mysteryReveals`) and are also visible in Admin → Orders → order detail under *"Games & Mystery Boxes"*.

## 20. Free Order Dice

A configurable post-purchase mini game (Admin → Store Settings → Free Order Dice):

- **Enable** the game, set **dice sides** (e.g. 6) and the **winning number** (e.g. 6 → win chance 1 in 6)
- After paying, the order success page shows the **Lucky Dice** panel with a *Roll the dice* button and an animated dice tumble
- **Winners get a coupon for the order total** — a single-use `LUCKY-XXXXXX` fixed-amount discount is created automatically, shown on screen with a copy button and emailed to the customer. The payment itself is never refunded.
- Small imprint shown under the game and in the win email: *"Doesn't refund — if you win, you get a coupon for the same price."*

**Anti-cheat / correctness:** the roll happens only on the server, exactly once per order (atomic claim on `Order.diceRoll`), the result is persisted (`diceRoll`, `diceTarget`, `diceWon`, `diceCouponCode`), refreshing or replaying can't re-roll, and clients can't influence the outcome. Coupons appear in Admin → Discounts with source `dice`. Paid orders **and Cash on Delivery orders** (payment collected on delivery) with a total above zero can play.

---

## 21. Page Builder & Themes (Shopify-style editor)

**Admin → Page Builder** is a visual, drag-and-drop homepage editor modeled after the Shopify theme editor:

- **Structure tree** (left) — every section of the homepage, drag to reorder, click to edit, plus a searchable *Add section* catalog grouped by category
- **Live preview canvas** (center) — sections render exactly like the storefront, with Desktop / Tablet / Mobile device widths, a blue selection highlight with a label chip and a floating action toolbar (move, duplicate, hide, delete)
- **Inspector** (right) — per-section settings with a *Content* tab and a *Design* tab (background, text color, vertical spacing, content width, scoped **Custom CSS**), plus *Remove section*
- **20 section types** — hero, slideshow, announcement bar, product grid, image + text, marquee, text, rich text, image, video, discounts, countdown timer, CTA banner, newsletter signup, testimonials, stats, logo cloud, FAQ, contact form and custom HTML
- **Responsive editing** — sections with device-specific behavior (hero height, grid columns, slideshow height) expose a Desktop/Mobile toggle in the inspector; storefront renders per-breakpoint values
- **Themes** — one-click presets (Minimal Mono, Bold Street, Pastel Soft, Luxe Serif, Playful Pop, Noir Dark, Fresh Mint, Deep Ocean) that set colors, fonts, button shape and corner radius store-wide; fine-tune everything under Admin → Appearance
- **Starter templates** — Starter Store, Product Launch and Editorial Brand fill the page with a sensible section stack in one click
- **Draft / publish workflow** — edits auto-save as drafts with undo/redo (Ctrl+Z / Ctrl+Shift+Z); nothing goes live until *Publish*. Admins can inspect unpublished changes on the real storefront via `/?preview=1`

## 22. Newsletter Campaigns

**Admin → Newsletter** replaces the plain-HTML box with a full campaign system:

- **Visual email editor** — stack of blocks (heading, rich text with bold/italic/links/lists, image, button, divider, spacer) with drag-to-reorder, duplicate and a live email preview that renders the exact HTML subscribers receive, in desktop and mobile widths
- **Full-image mode** — upload one big image instead of text; the whole image becomes a click-through link to any page of the store
- **Campaign management** — drafts, subject + preheader, accent color, per-recipient delivery tracking (pending/sent/failed with the SMTP error), resumable batched sending (never lose a send if the browser closes) and a *send test* button
- **Bulletproof email HTML** — table-based layout, inline styles, per-store header (name or logo) and a footer with the store address and a **personalized unsubscribe link**
- **Unsubscribe flow** — every email links to `/unsubscribe?token=…` with a one-click confirm page; unsubscribes are tracked per subscriber and respected by all future sends
- **Subscriber management** — search, add manually, CSV import/export, source tracking (storefront vs admin)

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
