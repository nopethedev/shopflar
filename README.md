<div align="center">

# Shopflar

**The self-hosted Shopify alternative.** A complete storefront, admin, visual theme editor and app marketplace —
on your own server, with your own database, and no per-sale fees.

[![Docker](https://github.com/nopethedev/shopflar/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/nopethedev/shopflar/actions/workflows/docker-publish.yml)
[![CI](https://github.com/nopethedev/shopflar/actions/workflows/ci.yml/badge.svg)](https://github.com/nopethedev/shopflar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Quick start](#-quick-start) · [Features](#-features) · [Theme editor](#-theme-editor) · [App Library](#-app-library) · [Claude / MCP](#-build-with-claude-mcp) · [Docs](#-documentation)

</div>

---

## ✨ Why Shopflar

|  | Shopflar | Hosted platforms |
|---|---|---|
| Monthly fee / transaction cut | **None** — it's your server | $30–$300+/mo plus 0.5–2% per sale |
| Your data | **Your database** (SQLite or PostgreSQL) | Their cloud |
| Payments | Stripe, PayPal, **crypto** (Coinbase, NOWPayments, your own wallet), COD | Limited by region and policy |
| Customization | Visual editor **and** full source code | Themes + app lock-in |
| AI | Built-in assistant **and an MCP server so Claude can run the store** | Add-on subscriptions |

## 🚀 Quick start

### Docker + PostgreSQL (recommended)

```bash
git clone https://github.com/nopethedev/shopflar && cd shopflar
cp .env.docker.example .env.docker
#   set NEXTAUTH_SECRET   →  openssl rand -hex 32
#   set POSTGRES_PASSWORD →  openssl rand -hex 24
#   set the public URLs (NEXTAUTH_URL, APP_URL, NEXT_PUBLIC_APP_URL)
docker compose --env-file .env.docker up -d
```

Open **http://localhost:3000/install** to create your admin account. That's it — Postgres, the app and the schema
are all handled. Prebuilt images are published to `ghcr.io/nopethedev/shopflar` on every push to `main`.
Details, backups and upgrades: [docs/DOCKER.md](docs/DOCKER.md).

> One container, no database server? `docker compose -f docker-compose.sqlite.yml --env-file .env.docker up -d`

### From source

```bash
bun install            # or: npm install
cp .env.example .env   # set NEXTAUTH_SECRET at minimum
bun run db:push        # create the SQLite database
bun run db:seed        # optional demo catalog → admin@shopflar.dev / admin12345
bun run dev            # http://localhost:3000  ·  admin at /admin
```

Requires Node 20+ (22 recommended) or Bun. Switch to PostgreSQL any time with `node scripts/switch-db.js postgres`.

## 🛍️ Features

**Storefront** — fast server-rendered pages, product variants, categories & search, cart & wishlist, guest and account
checkout, discount codes, reviews, SEO (sitemap, robots, Open Graph), cookie consent, legal pages, maintenance &
pre-launch modes, 24 ready-made themes.

**Admin** — dashboard & reports, products (variants, images, digital downloads, code pools, mystery boxes), orders
(edit, refund, tracking, mark paid), customers, categories, discounts, shipping & tax rules, newsletter campaigns with a
visual email editor, custom pages, users & roles, activity log, Discord notifications, one-click updater.

**Selling** — Stripe cards & wallets · PayPal (REST or email-only) · **Bitcoin, ETH, USDC and more** · cash on delivery ·
Printify, Printful and CJ fulfillment with tracking sync · region-based shipping and tax.

**Self-hosting** — Docker image with PostgreSQL or SQLite, GitHub Actions CI/CD, resettable demo mode, `.env`-driven config,
secrets stored server-side only.

## 🎨 Theme editor

A Shopify-style editor at **Admin → Theme editor**, working on the **real storefront** — not a mock-up.

- **Click anything in the live preview** to edit it, at true desktop / tablet / mobile breakpoints
- **28 section types**: hero, slideshow, product grid, collection list, featured product, promo tiles, gallery, feature
  columns, testimonials, pull quote, FAQ, countdown, social links, newsletter, custom HTML and more
- **Content + Design tabs**: backgrounds (colour or image), spacing, width, borders, hide-on-device, scroll animation,
  anchors and scoped custom CSS — on every section
- **Draft → Publish**: everything autosaves as a draft (even hide/reorder/delete); **undo/redo covers all of it**; nothing
  goes live until you publish, and *Discard* restores the live version
- **Edit any custom page**, insert sections exactly where you want, start from one of six templates, link pickers for
  your pages / categories / products, and an HTML toolbar for text blocks

## 🧩 App Library

**Admin → App Library** is a searchable catalog of 30 integrations. Toggle, configure, done — secrets never leave the server.

| | |
|---|---|
| **Payments** | Stripe · PayPal · **Coinbase Commerce** · **NOWPayments** · **self-custodial wallet transfer** |
| **Fulfillment** | Printify · Printful & CJ · shipping rates · tax · order tracking |
| **Marketing** | Newsletter & campaigns · **Mailchimp sync** · Discord alerts · SMTP |
| **Analytics** | GA4 · Tag Manager · Meta Pixel · **TikTok Pixel** · **Plausible** · **Umami** *(consent-aware)* |
| **Support** | **Crisp** · **Tawk.to** · **WhatsApp chat button** |
| **Store features** | Mystery boxes · reviews · wishlist · cookie consent · **custom head/body code** |
| **AI** | Sidekick assistant · **MCP server** |

Crypto payments are verified server-side (signed webhooks + re-fetching the charge/amount from the provider), never from
the browser.

## 🤖 Build with Claude (MCP)

Shopflar speaks the [Model Context Protocol](https://modelcontextprotocol.io). Create a key under
**App Library → MCP server**, connect Claude, and run the store in plain language:

```bash
claude mcp add --transport http shopflar https://YOUR-STORE/api/mcp \
  --header "Authorization: Bearer sfk_YOUR_KEY"
```

> *"Create three draft products for a summer sock collection, make a 15% code SUMMER15 that ends Aug 31, draft a launch
> newsletter, and add a promo-tiles section to the home page."*

27 tools cover products, categories, discounts, pages, newsletter drafts, orders and the theme editor. It is **safe by
design**: opt-in, scoped keys (read-only or read-write), everything is created as a draft, nothing is hard-deleted, no
email is sent and no money moves without a human, and every write is audit-logged. See [docs/MCP.md](docs/MCP.md).

## 🏗️ Architecture

```
src/
├── app/            Next.js App Router — storefront, /admin, /api (REST, webhooks, /api/mcp)
├── components/     storefront/ · admin/ (incl. theme editor) · ui/ (shadcn)
└── lib/
    ├── payments/   Stripe · PayPal · crypto providers behind one interface
    ├── mcp/        MCP server: keys, JSON-RPC handler, tool catalog
    ├── section-catalog.ts   every theme-editor block (shared by editor, renderer, MCP)
    ├── page-sections.ts     draft / publish model for page sections
    ├── app-catalog.ts       App Library definitions
    └── services/orders.ts   server-authoritative order creation
prisma/schema.prisma         SQLite or PostgreSQL (switched automatically in Docker)
```

**Stack:** Next.js 16 · React 19 · TypeScript · Prisma · Tailwind 4 · shadcn/ui · Zustand · Zod.

**Security model:** admin routes behind `requireAdmin()`; scrypt password hashing; HTTP-only signed session cookies;
prices always read from the database at checkout; payment status confirmed with the provider before an order is paid
(and idempotently — webhook retries can't double-fulfil); webhook signatures verified; inputs validated with Zod; HTML
and URLs from admins and the MCP server sanitised; secret fields are masked and never returned to the browser.

## 📚 Documentation

| | |
|---|---|
| [docs/GUIDE.md](docs/GUIDE.md) | Full manual — Stripe, PayPal, Printify, Supabase, email verification, newsletters, updater, AI assistant… |
| [docs/DOCKER.md](docs/DOCKER.md) | Docker, PostgreSQL, backups, GitHub Actions |
| [docs/MCP.md](docs/MCP.md) | Connect Claude and the full tool list |
| [DEPLOY.md](DEPLOY.md) | Production deployment notes |
| [QUICKSTART.md](QUICKSTART.md) | Local development in five minutes |

## 🤝 Contributing

Issues and PRs are welcome. `bun run lint` and `bun run build` should pass; CI also builds the Docker image and
smoke-tests it against PostgreSQL. Please never commit `.env` files or API keys.

## 📄 License

[MIT](LICENSE)
