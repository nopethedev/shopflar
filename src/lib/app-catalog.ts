// App Library catalog — every integration and add-on Shopflar can run.
// Pure data (no React, no DB) so the admin UI, the storefront embeds, the
// payment layer and the MCP server all share one definition.

export type AppField = {
  key: string
  label: string
  type: 'text' | 'secret' | 'select' | 'textarea' | 'toggle'
  placeholder?: string
  help?: string
  options?: [string, string][]
  required?: boolean
}

export type AppDef = {
  slug: string
  name: string
  description: string
  category: AppCategory
  /** lucide icon name */
  icon: string
  /** Tailwind classes for the icon tile */
  tint?: string
  /** Always-on core feature with its own settings page (no install toggle) */
  core?: boolean
  /** Settings page inside the admin that owns the configuration */
  configPage?: string
  /** Inline settings rendered by the App Library itself */
  fields?: AppField[]
  /** Short list shown in the config dialog */
  setup?: string[]
  docsUrl?: string
  badge?: 'New' | 'Popular' | 'Beta'
}

export const APP_CATEGORIES = [
  'Payments', 'Shipping & fulfillment', 'Marketing & email', 'Analytics & tracking',
  'Customer support', 'Store features', 'AI & automation'
] as const
export type AppCategory = typeof APP_CATEGORIES[number]

export const APP_CATALOG: AppDef[] = [
  // ───────────── Payments ─────────────
  {
    slug: 'stripe', name: 'Stripe', category: 'Payments', icon: 'CreditCard', core: true, configPage: '/admin/payments',
    description: 'Accept cards, Apple Pay and Google Pay. Credentials are stored server-side only.', tint: 'bg-indigo-100 text-indigo-700'
  },
  {
    slug: 'paypal', name: 'PayPal', category: 'Payments', icon: 'Wallet', core: true, configPage: '/admin/payments',
    description: 'PayPal checkout via REST API, or PayPal Standard with just an email address and IPN.', tint: 'bg-sky-100 text-sky-700'
  },
  {
    slug: 'crypto-coinbase', name: 'Crypto — Coinbase Commerce', category: 'Payments', icon: 'Bitcoin', badge: 'New', tint: 'bg-amber-100 text-amber-700',
    description: 'Accept Bitcoin, Ethereum, USDC, Litecoin and more through Coinbase Commerce hosted checkout. Orders are marked paid automatically when the charge confirms.',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'secret', required: true, placeholder: 'Coinbase Commerce API key', help: 'Coinbase Commerce → Settings → API keys.' },
      { key: 'webhookSecret', label: 'Webhook shared secret', type: 'secret', required: true, help: 'Coinbase Commerce → Settings → Webhook subscriptions → Show shared secret.' },
      { key: 'label', label: 'Checkout label', type: 'text', placeholder: 'Pay with crypto', help: 'Shown to customers at checkout.' }
    ],
    setup: ['Create a Coinbase Commerce account and an API key.', 'Add the webhook endpoint shown below in Coinbase Commerce.', 'Paste the API key and shared secret here and enable the app.'],
    docsUrl: 'https://docs.cdp.coinbase.com/commerce-onchain/docs/welcome'
  },
  {
    slug: 'crypto-nowpayments', name: 'Crypto — NOWPayments', category: 'Payments', icon: 'Coins', badge: 'New', tint: 'bg-emerald-100 text-emerald-700',
    description: '300+ cryptocurrencies with automatic conversion and a hosted invoice page. Verified IPN callbacks mark orders paid.',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'ipnSecret', label: 'IPN secret key', type: 'secret', required: true, help: 'NOWPayments → Store settings → Instant payment notifications.' },
      { key: 'sandbox', label: 'Sandbox mode', type: 'toggle', help: 'Use the NOWPayments sandbox API for testing.' },
      { key: 'label', label: 'Checkout label', type: 'text', placeholder: 'Pay with crypto' }
    ],
    setup: ['Create a NOWPayments account and generate an API key.', 'Set the IPN callback URL shown below and copy the IPN secret.', 'Paste both here and enable the app.'],
    docsUrl: 'https://documenter.getpostman.com/view/7907941/2s93JusNJt'
  },
  {
    slug: 'crypto-manual', name: 'Crypto — Wallet transfer', category: 'Payments', icon: 'QrCode', badge: 'New', tint: 'bg-orange-100 text-orange-700',
    description: 'No processor needed: show your own wallet addresses at checkout. Customers send funds and you mark the order paid once it lands — fully self-custodial.',
    fields: [
      { key: 'wallets', label: 'Wallets (one per line: COIN | NETWORK | ADDRESS)', type: 'textarea', required: true, placeholder: 'BTC | Bitcoin | bc1q…\nETH | Ethereum | 0x…\nUSDC | Base | 0x…' },
      { key: 'instructions', label: 'Instructions for customers', type: 'textarea', placeholder: 'Send the exact USD-equivalent amount and include your order number in the transaction memo if possible.' },
      { key: 'label', label: 'Checkout label', type: 'text', placeholder: 'Crypto (wallet transfer)' }
    ],
    setup: ['Add the wallet addresses you control.', 'Orders stay Unpaid until you confirm the transaction and mark them paid in Orders.']
  },

  // ───────────── Shipping & fulfillment ─────────────
  { slug: 'printify', name: 'Printify', category: 'Shipping & fulfillment', icon: 'Shirt', core: true, configPage: '/admin/printify', description: 'Sync print-on-demand products and push paid orders to Printify for fulfillment.', tint: 'bg-green-100 text-green-700' },
  { slug: 'printful', name: 'Printful & CJ Dropshipping', category: 'Shipping & fulfillment', icon: 'Package', core: true, configPage: '/admin/fulfillment', description: 'Auto-send paid orders to Printful or CJ Dropshipping and sync tracking back.', tint: 'bg-orange-100 text-orange-700' },
  { slug: 'shipping-rates', name: 'Shipping rates', category: 'Shipping & fulfillment', icon: 'Truck', core: true, configPage: '/admin/shipping', description: 'Flat, free-over-threshold and weight-based shipping methods per region.', tint: 'bg-slate-100 text-slate-700' },
  { slug: 'tax-rates', name: 'Tax rates', category: 'Shipping & fulfillment', icon: 'Receipt', core: true, configPage: '/admin/tax', description: 'Region-based sales tax and VAT applied at checkout.', tint: 'bg-slate-100 text-slate-700' },
  { slug: 'tracking', name: 'Order tracking', category: 'Shipping & fulfillment', icon: 'MapPin', core: true, configPage: '/admin/tracking', description: 'Sync carrier tracking numbers and show shipment progress to customers.', tint: 'bg-slate-100 text-slate-700' },

  // ───────────── Marketing & email ─────────────
  { slug: 'newsletter', name: 'Newsletter & campaigns', category: 'Marketing & email', icon: 'Mail', configPage: '/admin/newsletter', description: 'Signup forms, a subscriber list with CSV export and a campaign composer with batch sending.', tint: 'bg-rose-100 text-rose-700' },
  {
    slug: 'mailchimp', name: 'Mailchimp sync', category: 'Marketing & email', icon: 'Send', badge: 'New', tint: 'bg-yellow-100 text-yellow-700',
    description: 'Every newsletter signup is also added to your Mailchimp audience, so your existing flows and automations keep working.',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'secret', required: true, placeholder: 'xxxxxxxx-us21', help: 'Mailchimp → Account → Extras → API keys. The data-center suffix (us21) is detected automatically.' },
      { key: 'audienceId', label: 'Audience ID', type: 'text', required: true, placeholder: 'a1b2c3d4e5', help: 'Audience → Settings → Audience name and defaults.' },
      { key: 'tags', label: 'Tags (comma separated)', type: 'text', placeholder: 'shopflar, website' }
    ]
  },
  { slug: 'discord-notifications', name: 'Discord notifications', category: 'Marketing & email', icon: 'MessageSquare', core: true, configPage: '/admin/notifications', description: 'Get new orders, low-stock alerts and store events in a Discord channel.', tint: 'bg-violet-100 text-violet-700' },
  { slug: 'email-smtp', name: 'Transactional email (SMTP)', category: 'Marketing & email', icon: 'AtSign', core: true, configPage: '/admin/email', description: 'Order confirmations, shipping updates and password resets through your SMTP provider.', tint: 'bg-slate-100 text-slate-700' },

  // ───────────── Analytics & tracking ─────────────
  { slug: 'google-analytics', name: 'Google Analytics 4', category: 'Analytics & tracking', icon: 'BarChart3', core: true, configPage: '/admin/tracking', badge: 'Popular', tint: 'bg-orange-100 text-orange-700', description: 'Page views and ecommerce events with a GA4 measurement ID. Loads only after the visitor accepts analytics cookies.' },
  { slug: 'google-tag-manager', name: 'Google Tag Manager', category: 'Analytics & tracking', icon: 'Tags', core: true, configPage: '/admin/tracking', tint: 'bg-blue-100 text-blue-700', description: 'Manage every tag from the GTM dashboard instead of editing your store.' },
  { slug: 'meta-pixel', name: 'Meta Pixel', category: 'Analytics & tracking', icon: 'Target', core: true, configPage: '/admin/tracking', tint: 'bg-blue-100 text-blue-700', description: 'Track conversions and build audiences for Facebook and Instagram ads. Requires marketing consent.' },
  {
    slug: 'tiktok-pixel', name: 'TikTok Pixel', category: 'Analytics & tracking', icon: 'Music2', tint: 'bg-pink-100 text-pink-700',
    description: 'Measure TikTok ad conversions and optimize campaigns.',
    fields: [{ key: 'pixelId', label: 'Pixel ID', type: 'text', required: true, placeholder: 'C1234567890ABCDEF' }]
  },
  {
    slug: 'plausible', name: 'Plausible Analytics', category: 'Analytics & tracking', icon: 'LineChart', tint: 'bg-indigo-100 text-indigo-700',
    description: 'Lightweight, cookie-free, privacy-friendly analytics. Works with Plausible Cloud or self-hosted.',
    fields: [
      { key: 'domain', label: 'Site domain', type: 'text', required: true, placeholder: 'mystore.com' },
      { key: 'scriptUrl', label: 'Script URL', type: 'text', placeholder: 'https://plausible.io/js/script.js', help: 'Change only if you self-host Plausible.' }
    ]
  },
  {
    slug: 'umami', name: 'Umami', category: 'Analytics & tracking', icon: 'Activity', tint: 'bg-slate-100 text-slate-700',
    description: 'Open-source, self-hostable analytics without cookies.',
    fields: [
      { key: 'websiteId', label: 'Website ID', type: 'text', required: true },
      { key: 'scriptUrl', label: 'Script URL', type: 'text', required: true, placeholder: 'https://analytics.example.com/script.js' }
    ]
  },

  // ───────────── Customer support ─────────────
  {
    slug: 'crisp-chat', name: 'Crisp live chat', category: 'Customer support', icon: 'MessagesSquare', tint: 'bg-blue-100 text-blue-700',
    description: 'Live chat widget with a shared inbox. Free tier available.',
    fields: [{ key: 'websiteId', label: 'Website ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }]
  },
  {
    slug: 'tawk-to', name: 'Tawk.to chat', category: 'Customer support', icon: 'MessageCircle', tint: 'bg-green-100 text-green-700',
    description: 'Free live chat widget with mobile apps.',
    fields: [
      { key: 'propertyId', label: 'Property ID', type: 'text', required: true },
      { key: 'widgetId', label: 'Widget ID', type: 'text', required: true, placeholder: 'default' }
    ]
  },
  {
    slug: 'whatsapp-chat', name: 'WhatsApp chat button', category: 'Customer support', icon: 'Phone', badge: 'New', tint: 'bg-emerald-100 text-emerald-700',
    description: 'A floating “Chat with us” button that opens a WhatsApp conversation with your store number.',
    fields: [
      { key: 'phone', label: 'WhatsApp number (international)', type: 'text', required: true, placeholder: '14155550123' },
      { key: 'message', label: 'Prefilled message', type: 'text', placeholder: 'Hi! I have a question about…' },
      { key: 'position', label: 'Position', type: 'select', options: [['right', 'Bottom right'], ['left', 'Bottom left']] }
    ]
  },

  // ───────────── Store features ─────────────
  { slug: 'mystery-crate', name: 'Mystery Crate', category: 'Store features', icon: 'Gift', configPage: '/admin/apps/mystery-crate', description: 'Mystery box products with weighted random items. Customers love the surprise — you control the odds.', tint: 'bg-purple-100 text-purple-700' },
  { slug: 'product-reviews', name: 'Product reviews', category: 'Store features', icon: 'Star', configPage: '/admin/reviews', description: 'Customers review products; you moderate before anything goes live.', tint: 'bg-amber-100 text-amber-700' },
  { slug: 'wishlist', name: 'Wishlist', category: 'Store features', icon: 'Heart', description: 'Let shoppers save products for later. Persists across sessions.', tint: 'bg-rose-100 text-rose-700' },
  { slug: 'cookie-consent', name: 'Cookie consent banner', category: 'Store features', icon: 'Cookie', description: 'GDPR/CCPA consent banner with an audit trail of choices stored in your database.', tint: 'bg-stone-100 text-stone-700' },
  {
    slug: 'custom-code', name: 'Custom code', category: 'Store features', icon: 'Code', badge: 'New', tint: 'bg-zinc-100 text-zinc-700',
    description: 'Paste any script or HTML snippet — verification tags, widgets, fonts — into the head or the end of every storefront page.',
    fields: [
      { key: 'head', label: 'Inside <head>', type: 'textarea', placeholder: '<meta name="…" content="…">' },
      { key: 'body', label: 'Before </body>', type: 'textarea', placeholder: '<script>…</script>' }
    ]
  },

  // ───────────── AI & automation ─────────────
  { slug: 'sidekick', name: 'Sidekick AI assistant', category: 'AI & automation', icon: 'Sparkles', core: true, configPage: '/admin/ai', description: 'Chat assistant inside the admin that drafts product copy and campaigns. Bring your own model key.', tint: 'bg-fuchsia-100 text-fuchsia-700' },
  { slug: 'mcp-server', name: 'MCP server for Claude', category: 'AI & automation', icon: 'Bot', badge: 'New', configPage: '/admin/apps/mcp', description: 'Connect Claude (or any MCP client) to build products, discounts, campaigns and pages by chatting.', tint: 'bg-orange-100 text-orange-700' }
]

export const APP_BY_SLUG: Record<string, AppDef> = Object.fromEntries(APP_CATALOG.map(a => [a.slug, a]))
