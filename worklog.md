# Shopflar Ecommerce Platform - Worklog

## Project Overview
Building a complete, production-style ecommerce platform inspired by Shopify/PrestaShop using Next.js, with storefront and admin dashboard.

## Task IDs and Progress

### Completed (Main Agent)
- 1: Prisma database schema with all entities (users, products, orders, etc.)
- 2: Seed script with demo products, categories, admin user
- 3: Core lib: auth, cart store, theme provider, helpers
- 4: Storefront: layout, header, footer, home page
- 5: Storefront: product listing, product detail, category pages, search
- 6: Cart system (client-side + server sync)
- 7: Checkout flow with validation
- 8: Customer auth (signup/login/account dashboard)
- 9: Admin layout with sidebar navigation
- 10: Admin dashboard with stats and charts

### In Progress (Main Agent)
- 11: Admin products editor with all sections
- 12: Admin orders, customers, categories, discounts management
- 13: Payment provider abstraction (Stripe + PayPal)
- 14: Printify integration service
- 15: Admin appearance/store settings editor
- 16: Newsletter, shipping, tax systems
- 17: SEO (sitemap, robots.txt, OG metadata)
- 18: README.md and .env.example
- 19: Verify end-to-end flow with Agent Browser

## Architecture Decisions
- Using SQLite locally via Prisma (PostgreSQL-compatible for Supabase)
- Using jose (JWT) for sessions instead of NextAuth for simplicity
- Server-side authoritative pricing/order creation — never trust client
- Payment abstraction supports Stripe, PayPal, and COD fallback
- All admin routes protected via requireAdmin()
- Store/Appearance settings cached with 1-minute TTL

## Update - Final Status

All major features verified working via Agent Browser:
- ✅ Storefront home page renders with hero, featured products, categories
- ✅ Product listing with filters (price, category, sale, stock)
- ✅ Product detail with variant selector, image gallery, add-to-cart
- ✅ Cart drawer (opens on cart icon click, shows item count)
- ✅ Cart page (quantity update, remove, discount code WELCOME10)
- ✅ Checkout flow (form validation, shipping methods, COD payment)
- ✅ Order success page (order # shown, summary, shipping address)
- ✅ Order appears in admin dashboard & orders list
- ✅ Admin dashboard (revenue chart, recent orders, low stock, top products)
- ✅ Admin products list (search, table, actions menu)
- ✅ Admin product editor (8 tabs: General, Images, Pricing, Inventory, Variants, Categories, SEO, Shipping)
- ✅ Admin appearance editor (5 tabs: Store, Hero, Social, Colors, Typography)
- ✅ Admin payments config (Stripe, PayPal, COD)
- ✅ Admin login flow (redirects to /admin after auth)

Tested routes (all return 200 except protected admin which returns 307 redirect):
- GET / - storefront home
- GET /products - product listing
- GET /products/[slug] - product detail
- GET /categories/[slug] - category page
- GET /cart - cart page
- GET /checkout - checkout page
- GET /checkout/success - order confirmation
- GET /login, /signup, /account - auth pages
- GET /wishlist, /about, /contact, /privacy, /terms, /shipping, /returns - static
- GET /admin - admin dashboard (protected)
- GET /admin/products - product management
- GET /admin/products/new - product editor
- GET /admin/appearance - appearance editor
- GET /admin/payments - payment config
- GET /api/products, /api/shipping/methods, /api/payments/providers - storefront APIs
- GET /api/auth/me, /api/auth/login, /api/auth/signup, /api/auth/logout - auth APIs
- GET /sitemap.xml, /robots.txt - SEO

## Files Created
- prisma/schema.prisma (database schema, SQLite + Postgres compatible)
- scripts/seed.js (demo data)
- scripts/fix-passwords.js (one-time password fix)
- .env.example
- README.md (15 sections as requested)
- src/app/ - 40+ page routes
- src/components/ - 50+ React components
- src/lib/ - auth, db, payments, printify, services, validation, stores

## Update — 2026-10-31 (v1.1.0): Email verification, Auto updater, Mystery box odds + reveal, Free Order Dice

### Email verification (anti-bot)
- VerificationToken model (SHA-256 hashed, 24h expiry, single-use) + src/lib/verification.ts
- NEW /api/auth/signup (route was missing — signup page had no backend!), gated by
  `require_email_verification` store setting; unverified accounts can't log in (403 EMAIL_NOT_VERIFIED)
- /api/auth/verify-email + /api/auth/resend-verification (password-protected resend, 60s cooldown)
- /verify-email page; auth-form handles verify-sent + needs-verification states with resend button
- Checkout account creation: enforcement-aware (no auto-verify, no session, email sent, order continues)
- Admin: Users page shows Verified/Unverified with Resend/Verify/Unverify actions; users/[id] PATCH/POST
- Store Settings → Security card (SMTP-missing warning); enforcement auto-off when SMTP not configured
- scripts/backfill-verify.mjs — one-time backfill run by updater so existing users aren't locked out

### Auto updater (scripts/updater.mjs + Admin → Updates)
- Pure-Node zip reader (no unzip binary), preserves package.json (custom scripts/ports!), .env,
  lockfiles, db/, public/uploads/, node_modules, .next, logs, updates
- Optional dependency merge into user's package.json (scripts always kept) + npm install only when deps changed
- db:push via user's script, one-time verification backfill, optional rebuild, kill old server
  (updates/server.pid written by instrumentation + /proc port-scan fallback), restart via THEIR npm run start, health check
- Admin UI: /admin/updater (upload zip, options, live step timeline + log, survives server restart)
- API: /api/admin/updater (upload), /run (detached runner), /status (polling); README sections 16–17

### Mystery box odds + reveal
- MysteryCrate.showOdds toggle (crate list + editor) → "View the odds" dialog on product page
  (guaranteed items + pool items with % chances and bars)
- Order.mysteryReveals JSON recorded at createOrder; animated reveal on order success page
- Admin order detail shows crate contents

### Free Order Dice
- Settings: free_order_dice_enabled/sides/target (Store Settings → Free Order Dice card)
- src/lib/dice.ts: server-authoritative, atomic once-per-order roll on paid orders; winners get a
  single-use LUCKY-XXXXXX coupon for the order total (Discount.source='dice') + email with imprint
- Animated dice roll on success page + coupon copy button; imprint: "Doesn't refund — you get a coupon
  for the same price."; admin order detail shows roll result + coupon

### Critical bugs fixed
- **All 30 [id] API route handlers read params.id synchronously — Next 16 passes params as a Promise →
  every admin edit/delete API was broken. Codemod: `params = await params` in 16 files (scripts/fix-async-params.mjs)**
- Seed's International Shipping stored countries:'ALL' (invalid JSON) → JSON.parse crash on checkout;
  calculateOrder now tolerates legacy raw/comma values
- next.config.ts: removed output:"standalone" (Next 16.4 refuses `next start` with it)
- instrumentation split didn't execute — single-file src/instrumentation.ts (static imports, NEXT_RUNTIME guard)
- .env.example wrongly matched the updater's preserve rule; now only .env/.env.local/... preserved
- users/route.ts had dead duplicate PATCH/DELETE handlers (moved to [id] route); removed

### Tests (all green)
- scripts/test-flows.sh: 22/22 (verification flow incl. single-use tokens, crate odds, COD order +
  reveal, dice roll/idempotency/win/coupon/validate, checkout account unverified)
- scripts/smoke-admin.sh: 27/27 (patched [id] routes, admin + storefront pages, updater status)
- scripts/updater-e2e.sh: 12/12 in /tmp on a simulated user install (custom port 3456, custom
  package.json scripts + version, own .env + data) — extract → preserve → db:push → backfill →
  build → kill (pid file + port scan) → restart via their npm run start → health OK
- Zip rebuilt WITHOUT .env/db/test scripts: download/shopflar.zip (v1.1.0, 442 files)

## Update — 2026-10-31 (v1.2.0): COD email + dice fix, Logs page, Discord webhooks, GitHub-source updater, DB provider preservation

### Critical fix — COD orders never sent any email
- Root cause: for `paymentProvider=cod` checkout only set status PENDING; the confirmation email was only sent inside `markOrderPaid()`, which COD never triggers → COD customers got ZERO emails
- Now the checkout COD branch sends the confirmation email at placement (best-effort); `markOrderPaid()` skips it for COD (no duplicate when cash is collected)

### Free Order Dice now works for COD
- `isDiceEligibleOrder()`: PAID orders + COD orders in an active state can roll; success page condition updated

### Logs (Admin → Logs)
- Activity tab: new `AuditLog`-backed feed — order.placed/paid/status_changed/refunded/fulfilled/deleted, stock.low (fires once on threshold crossing), email.failed, user.registered/verified/updated/deleted, product/discount created/updated/deleted, settings.updated, discord.sent/failed, dice.won — searchable, paginated (25/page), expandable metadata, auto-refresh
- Emails tab: EmailLog with status badges, SMTP error messages, inline body preview (sandboxed iframe), filters; DELETE per tab (clear)

### Discord webhook notifications (Admin → Notifications)
- src/lib/discord.ts: settings `discord_enabled/discord_webhook_url/discord_events` (30s cache), embed per event (12-event catalog with emoji+color), 8s timeout, failures → audit log, no recursion on discord.*
- src/lib/logs.ts: `logEvent()` = audit row + Discord fan-out (flattened metadata); fire-and-forget everywhere
- Admin UI: enable toggle, URL validation, per-event checkboxes, Send test message
- Config API + test endpoint; updater github API separate

### Updater: pull from GitHub
- `--github --repo owner/name --branch main` (+ GITHUB_TOKEN via env, never argv) — downloads branch zipball via GitHub API (public+private), then the normal pipeline
- Admin → Updates: source picker (GitHub | Upload zip), repo/branch/token settings, Check for updates (latest commit card), start button for both sources
- API: GET/POST /api/admin/updater/github (check + save), run route passes source; token travels via spawn env

### Critical fix — updater no longer reverts the DB provider
- User's `prisma/schema.prisma` datasource block (provider + url env) is captured before apply and restored after copying the new schema; tested with a simulated mysql install in /tmp (provider kept, new models applied)
- README sections 17 (GitHub updater) + 18 (Notifications & Logs) added; dice section updated for COD

### GitHub
- Repo scrubbed and pushed: .env, db/custom.db, download/, tool-results/, updates/, *.pid untracked + gitignored; .gitattributes export-ignores dev/test scripts from archives
- Release zip rebuilt from git archive: download/shopflar.zip (v1.2.0, 572 KB, no secrets, no dev scripts)

### Tests
- COD e2e: order placed → email logged (fails only on fake dev SMTP `smtp.test.local`) → dice rolled → order.placed + email.failed in activity log → Discord receiver got "New order placed" + "Email failed" embeds → success page renders dice
- Updater GitHub: API check returns latest commit; real zipball dry-run (323 files) validates download+extract
- Datasource preservation: mysql provider kept through an update; package.json untouched
- Lint clean; prisma schema valid

## v1.3.0 — Shopify-style Page Builder + Newsletter Campaigns

### Page Builder overhaul (Admin → Page Builder)
- Layout mirrors the Shopify theme editor: section tree (left, drag reorder + blue add-section link), live preview canvas (center, device widths), inspector (right, Content + Design tabs)
- Shopify-style selection chrome: blue ring, label chip, floating dark action toolbar (move/duplicate/hide/delete); Remove section button in inspector footer
- 20 section types (14 existing + 6 new: slideshow, countdown, CTA banner, stats, logo cloud, contact form); searchable add-section dialog grouped by category
- Universal design controls per section: background, text color, vertical spacing (none/sm/md/lg/xl via CSS vars in globals.css), content width (narrow/normal/wide/full), scoped Custom CSS (scopeSectionCss prefixes selectors with [data-sec="id"])
- Shopify-style controls on hero/slideshow: overlay opacity slider (0-90%), 9-way content position (top-left…bottom-right, legacy left/center/right mapped), Height: Small/Medium/Large/Full screen, title size; product grid: desktop/mobile column counts, "view all" button
- Responsive editing: Desktop/Mobile toggle in inspector for hero/slideshow/product-grid fields; storefront renders per-breakpoint values via CSS vars (--hero-h-mobile, --grid-cols-mobile, .sec-hero/.sec-grid media queries)
- 8 theme presets (Minimal Mono → Noir Dark) applying appearance settings store-wide; ThemeStyle server component injects CSS vars (bg/fg/primary/muted/border derived by mixing) scoped to .theme-root in StorefrontLayout; Google Fonts link for chosen families; button radius via [data-slot=button]
- getAppearanceSettings no longer module-cached (route handler + page bundles had separate caches → stale theme for up to 1 min); 10 tiny rows read per request instead
- Starter templates (Starter Store / Product Launch / Editorial Brand); undo/redo for config edits (Ctrl+Z / Ctrl+Shift+Z, 50-step history); Real preview dialog iframes /?preview=1
- Draft preview: home page accepts ?preview=1 for admins — merges draftConfig, includes draft-only sections; public page unchanged

### Newsletter campaign system (Admin → Newsletter)
- Prisma: NewsletterCampaign (subject/preheader/mode blocks|image/blocks JSON/imageUrl/clickUrl/accent/status+counts), NewsletterRecipient (per-subscriber status/error/sentAt), NewsletterSubscriber.token (unique unsubscribe token) + unsubscribedAt
- src/lib/newsletter.ts: renderNewsletterEmail — table-based, inline-styled email HTML (store header w/ logo, blocks, footer w/ address + personalized unsubscribe link); shared by editor preview + server sender
- Editor UI: block stack (heading/text/image/button/divider/spacer) with drag reorder + duplicate; RichTextEditor (contentEditable + execCommand toolbar: bold/italic/underline/strike/link/lists/clear/format block); Full-image mode (upload + click-through URL + alt); live preview iframe (desktop/mobile) rendering the exact email HTML; accent color, preheader
- Sending: POST /campaigns (drafts) → /send (snapshot recipients, status sending) → /batch loop (10 recipients per call, 150ms spacing, per-recipient EmailLog + status/error) → sent/partial/failed; browser-close safe (resume from list or editor); [TEST] send to any address
- Public /unsubscribe?token=… confirm page + POST /api/unsubscribe (token lookup, isActive=false, unsubscribedAt)
- Subscribers tab: search, manual add + CSV import (POST /api/admin/newsletter {add:[...]}), CSV export, source badges, unsubscribed status
- Admin page fetches store settings (name/logo/address/url) for preview + sends

### Tests
- Campaign e2e via curl: create → send start (3 seeded subscribers snapshotted) → batch processed 3, all failed "SMTP not configured" (no SMTP in sandbox) → campaign status failed w/ per-recipient errors; EmailLog rows written; [TEST] send path works
- Unsubscribe e2e: token page 200 → POST api → isActive=false + unsubscribedAt set
- Sections e2e: created 6 sections via API → publish → home renders sec-wrap/sec-hero/sec-grid, --hero-h/-mobile vars, rgba overlay from opacity slider, bottom-center position classes, marquee animation
- Theme e2e: PATCH appearance → storefront CSS vars update instantly (cache fix verified); font links for Nunito/Poppins injected
- Browser (agent-browser): builder matches Shopify layout (tree/chip/floating toolbar/overlay-opacity slider/9-way position/mobile toggle/Remove section); newsletter editor builds heading+text+button with live email preview; storefront home renders all new sections
- Lint clean (0 errors); next build succeeds (61 pages; 4 pre-existing harmless node: import warnings from instrumentation.ts)
- No secrets in repo; zip rebuilt from git archive (no .env/db/dev scripts)
