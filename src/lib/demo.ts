// ============================================================
// Demo mode
//
// When DEMO_MODE=true the store runs as a disposable demo: a demo admin and
// sample catalogue are seeded, and the whole database is reset after
// DEMO_RESET_MINUTES (default 30) without any requests.
//
// The reset timer is tracked in db/demo-state.json so it survives the data
// wipe itself. Resets are serialised so two requests can't reset concurrently.
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { db } from './db'
import { hashPassword } from './password'

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export function isDemoMode(): boolean {
  return TRUTHY.has(String(process.env.DEMO_MODE || '').toLowerCase().trim())
}

export function demoResetMinutes(): number {
  const raw = Number(process.env.DEMO_RESET_MINUTES || 30)
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 30
}

export function demoAdminEmail(): string {
  return (process.env.DEMO_ADMIN_EMAIL || 'demo@shopflar.dev').toLowerCase().trim()
}

export function demoAdminPassword(): string {
  return process.env.DEMO_ADMIN_PASSWORD || 'demo12345'
}

export function usesDefaultDemoPassword(): boolean {
  return !process.env.DEMO_ADMIN_PASSWORD
}

type DemoState = {
  lastActivity: string
  lastReset: string
  resets: number
  reason?: string
}

const STATE_KEY = '__demo_state'

function statePath() {
  return path.join(process.cwd(), 'db', 'demo-state.json')
}

function parseState(raw: string | null | undefined): DemoState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.lastActivity) return null
    return {
      lastActivity: String(parsed.lastActivity),
      lastReset: String(parsed.lastReset || parsed.lastActivity),
      resets: Number(parsed.resets || 0),
      reason: parsed.reason
    }
  } catch {
    return null
  }
}

async function readState(): Promise<DemoState | null> {
  // The database is the source of truth so the timer also works on hosts with
  // no writable filesystem (Cloudflare Workers/D1).
  try {
    const row = await db.storeSetting.findUnique({ where: { key: STATE_KEY } })
    if (row) return parseState(row.value)
  } catch {
    // Table may not exist yet during setup.
  }
  try {
    return parseState(fs.readFileSync(statePath(), 'utf8'))
  } catch {
    return null
  }
}

async function writeState(state: DemoState) {
  try {
    await db.storeSetting.upsert({
      where: { key: STATE_KEY },
      update: { value: JSON.stringify(state) },
      create: { key: STATE_KEY, value: JSON.stringify(state) }
    })
  } catch {
    // Fall back to the local file below.
  }
  try {
    fs.mkdirSync(path.dirname(statePath()), { recursive: true })
    fs.writeFileSync(statePath(), JSON.stringify(state, null, 2))
  } catch {
    // Read-only filesystem: the database copy above is authoritative.
  }
}

let resetInFlight: Promise<void> | null = null
let lastTouch = 0

async function wipeDemoData() {
  // Order matters: children before parents for restrictive relations.
  await db.orderFulfillment.deleteMany()
  await db.payment.deleteMany()
  await db.discountUsage.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.cartItem.deleteMany()
  await db.cart.deleteMany()
  await db.wishlistItem.deleteMany()
  await db.productReview.deleteMany()
  await db.printifyVariantLink.deleteMany()
  await db.printifyProductLink.deleteMany()
  await db.mysteryCrate.deleteMany()
  await db.productVariant.deleteMany()
  await db.productImage.deleteMany()
  await db.productTag.deleteMany()
  await db.productCategory.deleteMany()
  await db.product.deleteMany()
  await db.category.updateMany({ data: { parentId: null } }).catch(() => {})
  await db.category.deleteMany()
  await db.address.deleteMany()
  await db.profile.deleteMany()
  await db.verificationToken.deleteMany()
  await db.user.deleteMany()
  await db.discount.deleteMany()
  await db.newsletterRecipient.deleteMany()
  await db.newsletterCampaign.deleteMany()
  await db.newsletterSubscriber.deleteMany()
  await db.shippingMethod.deleteMany()
  await db.taxRate.deleteMany()
  await db.auditLog.deleteMany()
  await db.customPage.deleteMany()
  await db.plugin.deleteMany()
  await db.cookieConsent.deleteMany()
  await db.pageSection.deleteMany()
  await db.emailLog.deleteMany()
  await db.printifyShop.deleteMany()
  await db.storeSetting.deleteMany()
  await db.appearanceSetting.deleteMany()
}

async function seedDemoData() {
  const admin = await db.user.create({
    data: {
      email: demoAdminEmail(),
      passwordHash: hashPassword(demoAdminPassword()),
      name: 'Demo Admin',
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
      profile: { create: { firstName: 'Demo', lastName: 'Admin' } }
    }
  })

  const customer = await db.user.create({
    data: {
      email: 'customer@example.com',
      passwordHash: hashPassword('customer123'),
      name: 'Demo Customer',
      role: 'CUSTOMER',
      emailVerified: new Date(),
      profile: { create: { firstName: 'Demo', lastName: 'Customer' } }
    }
  })

  await db.address.create({
    data: {
      userId: customer.id,
      firstName: 'Demo', lastName: 'Customer',
      address1: '123 Market St', city: 'San Francisco',
      state: 'CA', postalCode: '94103', country: 'US',
      phone: '+1 555 123 4567', isDefault: true
    }
  }).catch(() => {})

  const categories = []
  for (const c of [
    { name: 'Apparel', slug: 'apparel', description: 'Clothing for every season', sortOrder: 1 },
    { name: 'T-Shirts', slug: 't-shirts', description: 'Soft, durable everyday tees', sortOrder: 2 },
    { name: 'Hoodies', slug: 'hoodies', description: 'Cozy layering for cold days', sortOrder: 3 },
    { name: 'Accessories', slug: 'accessories', description: 'Hats, bags and small goods', sortOrder: 4 },
    { name: 'Footwear', slug: 'footwear', description: 'Sneakers and shoes', sortOrder: 5 }
  ]) {
    categories.push(await db.category.create({ data: c }))
  }
  const [apparel, tshirts, hoodies, accessories, footwear] = categories
  await db.category.update({ where: { id: tshirts.id }, data: { parentId: apparel.id } }).catch(() => {})

  const products = [
    {
      name: 'Everyday Cotton Tee', slug: 'everyday-cotton-tee',
      shortDescription: 'A soft, breathable cotton tee that goes with everything.',
      description: '<p>Our Everyday Cotton Tee is made from 100% organic combed cotton with a relaxed fit and a classic crew neckline.</p>',
      price: 32.0, compareAtPrice: 45.0, sku: 'TEE-COT-001', inventoryQty: 240, featured: true,
      categoryIds: [tshirts.id, apparel.id],
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop'
      ],
      variants: [
        { name: 'S / Black', Size: 'S', Color: 'Black', qty: 40 },
        { name: 'M / Black', Size: 'M', Color: 'Black', qty: 60 },
        { name: 'L / White', Size: 'L', Color: 'White', qty: 40 }
      ],
      tags: ['cotton', 'organic', 'unisex']
    },
    {
      name: 'Heavyweight Oversized Hoodie', slug: 'heavyweight-oversized-hoodie',
      shortDescription: 'Fleece-lined hoodie with a relaxed, oversized silhouette.',
      description: '<p>A 400gsm fleece-lined hoodie with a double-lined hood and a front kangaroo pocket.</p>',
      price: 89.0, compareAtPrice: 110.0, sku: 'HOOD-HVY-001', inventoryQty: 120, featured: true,
      categoryIds: [hoodies.id, apparel.id],
      images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'M / Charcoal', Size: 'M', Color: 'Charcoal', qty: 30 },
        { name: 'L / Charcoal', Size: 'L', Color: 'Charcoal', qty: 25 }
      ],
      tags: ['hoodie', 'heavyweight', 'fleece']
    },
    {
      name: 'Court Classic Sneaker', slug: 'court-classic-sneaker',
      shortDescription: 'Low-top leather sneaker with a vulcanized rubber sole.',
      description: '<p>A minimal court-style sneaker in full-grain leather with a memory-foam insole.</p>',
      price: 128.0, compareAtPrice: 145.0, sku: 'SNKR-CRT-001', inventoryQty: 60, featured: true,
      categoryIds: [footwear.id],
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'US 10 / White', Size: 'US 10', Color: 'White', qty: 15 },
        { name: 'US 11 / Black', Size: 'US 11', Color: 'Black', qty: 10 }
      ],
      tags: ['sneakers', 'leather']
    },
    {
      name: 'Wool Felt Dad Hat', slug: 'wool-felt-dad-hat',
      shortDescription: 'Unstructured wool-blend dad hat with a brass buckle.',
      description: '<p>A six-panel unstructured dad hat in a wool-blend felt with an adjustable leather strap.</p>',
      price: 38.0, sku: 'HAT-DAD-001', inventoryQty: 4, lowStockThreshold: 10, featured: false,
      categoryIds: [accessories.id],
      images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&auto=format&fit=crop'],
      variants: [{ name: 'One Size / Black', Size: 'One Size', Color: 'Black', qty: 4 }],
      tags: ['hat', 'wool']
    }
  ]

  const created = []
  for (const p of products) {
    const { categoryIds, images, variants, tags, ...prod } = p
    const row = await db.product.create({
      data: {
        ...prod,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        currency: 'USD',
        trackInventory: true,
        isOutOfStock: prod.inventoryQty === 0,
        categories: { create: categoryIds.map(categoryId => ({ categoryId })) },
        images: { create: images.map((url, i) => ({ url, sortOrder: i, altText: prod.name })) },
        variants: {
          create: variants.map(v => ({
            name: v.name,
            options: JSON.stringify({ Size: v.Size, Color: v.Color }),
            sku: `${prod.sku}-${v.Size}-${v.Color}`.replace(/\s+/g, '').toUpperCase(),
            inventoryQty: v.qty
          }))
        },
        tags: { create: tags.map(tag => ({ tag })) }
      }
    })
    created.push(row)
  }

  for (const sm of [
    { id: 'standard-free', name: 'Standard Shipping', description: '3-5 business days', price: 0, freeShippingThreshold: 75, countries: '["US","CA"]', estimatedDays: '3-5', sortOrder: 1 },
    { id: 'express', name: 'Express Shipping', description: '1-2 business days', price: 18.5, countries: '["US","CA"]', estimatedDays: '1-2', sortOrder: 2 },
    { id: 'international', name: 'International Shipping', description: '7-14 business days', price: 32, countries: '["ALL"]', estimatedDays: '7-14', sortOrder: 3 }
  ]) {
    await db.shippingMethod.create({ data: sm }).catch(() => {})
  }

  for (const tr of [
    { country: 'US', region: 'CA', rate: 8.5, name: 'California' },
    { country: 'US', region: 'NY', rate: 8.0, name: 'New York' },
    { country: 'CA', rate: 5.0, name: 'Canada GST' },
    { country: 'GB', rate: 20.0, name: 'UK VAT' }
  ]) {
    await db.taxRate.create({ data: tr }).catch(() => {})
  }

  for (const d of [
    { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) },
    { code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }
  ]) {
    await db.discount.create({ data: d }).catch(() => {})
  }

  const settings = [
    ['store_name', 'Shopflar Demo'],
    ['store_title', 'Shopflar Demo — Modern Apparel & Lifestyle'],
    ['store_description', 'A live, disposable demo of the Shopflar store builder and admin. Everything resets after 30 minutes of inactivity.'],
    ['store_email', 'demo@shopflar.dev'],
    ['store_phone', '+1 415 555 0100'],
    ['store_address', 'San Francisco, CA'],
    ['currency', 'USD'],
    ['currency_symbol', '$'],
    ['logo_url', ''],
    ['favicon_url', ''],
    ['footer_text', `© ${new Date().getFullYear()} Shopflar Demo. All rights reserved.`],
    ['social_twitter', 'https://twitter.com/shopflar'],
    ['social_instagram', 'https://instagram.com/shopflar'],
    ['social_facebook', 'https://facebook.com/shopflar'],
    ['social_tiktok', 'https://tiktok.com/@shopflar'],
    ['hero_image', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop'],
    ['hero_title', 'New Season, New Essentials'],
    ['hero_subtitle', 'Curated apparel and accessories designed to last — try the drag-and-drop builder and every admin tool in this resettable demo.'],
    ['hero_button_text', 'Shop the Collection'],
    ['hero_button_url', '/products'],
    ['featured_section_title', 'Featured Products'],
    ['featured_section_subtitle', 'Hand-picked favourites from our latest drop.'],
    ['new_arrivals_title', 'New Arrivals'],
    ['newsletter_title', 'Get 10% off your first order'],
    ['newsletter_subtitle', 'Subscribe for early access to new drops and exclusive offers.'],
    ['payment_cod_enabled', 'true'],
    ['payment_stripe_enabled', 'false'],
    ['payment_paypal_enabled', 'false'],
    ['install_complete', 'true'],
    ['demo_mode', 'true']
  ]
  for (const [key, value] of settings) {
    await db.storeSetting.create({ data: { key, value: String(value) } }).catch(() => {})
  }

  const appearance = [
    ['primary_color', '#1a1a1a'], ['secondary_color', '#6b7280'], ['accent_color', '#d97706'],
    ['background_color', '#ffffff'], ['text_color', '#1a1a1a'], ['button_style', 'rounded'],
    ['font_family', 'Inter'], ['heading_font', 'Display'], ['card_radius', '0.75rem'], ['container_max_width', '1280px']
  ]
  for (const [key, value] of appearance) {
    await db.appearanceSetting.create({ data: { key, value } }).catch(() => {})
  }

  const first = created[0]
  if (first) {
    const demoOrders = [
      {
        orderNumber: '#DEMO01', email: 'customer@example.com', userId: customer.id,
        status: 'DELIVERED', paymentStatus: 'PAID', fulfillmentStatus: 'FULFILLED',
        subtotal: 102, taxTotal: 8.67, total: 110.67,
        items: [
          { name: 'Everyday Cotton Tee', price: 32, quantity: 2, variantName: 'M / Black' },
          { name: 'Wool Felt Dad Hat', price: 38, quantity: 1, variantName: 'One Size / Black' }
        ],
        daysAgo: 1
      },
      {
        orderNumber: '#DEMO02', email: 'jane@example.com',
        status: 'SHIPPED', paymentStatus: 'PAID', fulfillmentStatus: 'FULFILLED',
        subtotal: 89, taxTotal: 7.56, total: 96.56,
        items: [{ name: 'Heavyweight Oversized Hoodie', price: 89, quantity: 1, variantName: 'L / Charcoal' }],
        daysAgo: 2
      },
      {
        orderNumber: '#DEMO03', email: 'mark@example.com',
        status: 'PENDING', paymentStatus: 'UNPAID', fulfillmentStatus: 'UNFULFILLED',
        subtotal: 128, taxTotal: 8, total: 136,
        items: [{ name: 'Court Classic Sneaker', price: 128, quantity: 1, variantName: 'US 10 / White' }],
        daysAgo: 3
      }
    ]
    for (const o of demoOrders) {
      await db.order.create({
        data: {
          orderNumber: o.orderNumber,
          email: o.email,
          userId: o.userId || null,
          status: o.status,
          paymentStatus: o.paymentStatus,
          fulfillmentStatus: o.fulfillmentStatus,
          subtotal: o.subtotal,
          taxTotal: o.taxTotal,
          total: o.total,
          currency: 'USD',
          shippingMethod: 'Standard Shipping',
          paymentProvider: 'stripe',
          shippingAddress: {
            firstName: 'Demo', lastName: 'Customer', address1: '123 Market St',
            city: 'San Francisco', state: 'CA', postalCode: '94103', country: 'US'
          },
          billingAddress: {
            firstName: 'Demo', lastName: 'Customer', address1: '123 Market St',
            city: 'San Francisco', state: 'CA', postalCode: '94103', country: 'US'
          },
          createdAt: new Date(Date.now() - o.daysAgo * 24 * 60 * 60 * 1000),
          items: {
            create: o.items.map(it => ({
              name: it.name, price: it.price, quantity: it.quantity,
              variantName: it.variantName, productId: first.id
            }))
          }
        }
      })
    }
  }

  await db.newsletterSubscriber.createMany({
    data: [
      { email: 'subscriber1@example.com' },
      { email: 'subscriber2@example.com', name: 'Sub Two' }
    ]
  }).catch(() => {})

  return admin
}

export async function resetDemo(reason = 'manual'): Promise<void> {
  if (resetInFlight) return resetInFlight
  resetInFlight = (async () => {
    const previous = await readState()
    await wipeDemoData()
    await seedDemoData()
    const now = new Date().toISOString()
    await writeState({
      lastActivity: now,
      lastReset: now,
      resets: (previous?.resets || 0) + 1,
      reason
    })
  })()
  try {
    await resetInFlight
  } finally {
    resetInFlight = null
    lastTouch = Date.now()
  }
}

async function touchDemoActivity() {
  const now = Date.now()
  if (now - lastTouch < 15_000) return
  lastTouch = now
  const state = await readState()
  if (!state) return
  await writeState({ ...state, lastActivity: new Date(now).toISOString() })
}

/**
 * Call on server requests in demo mode. Resets the database if the demo has
 * been idle for longer than the configured window, then records activity.
 */
export async function demoGuard(): Promise<{ reset: boolean }> {
  if (!isDemoMode()) return { reset: false }
  const state = await readState()
  if (!state) {
    await resetDemo('initial')
    return { reset: true }
  }
  const idleMs = Date.now() - new Date(state.lastActivity).getTime()
  if (!Number.isFinite(idleMs) || idleMs >= demoResetMinutes() * 60_000) {
    await resetDemo('inactivity')
    return { reset: true }
  }
  await touchDemoActivity()
  return { reset: false }
}

export type DemoStatus = {
  enabled: boolean
  resetMinutes: number
  lastActivity: string | null
  lastReset: string | null
  nextResetAt: string | null
  resets: number
  counts: { products: number; orders: number; customers: number }
  adminEmail: string
  defaultPassword: string | null
  ai: { configured: boolean; model: string; baseUrl: string }
}

export async function getDemoStatus(): Promise<DemoStatus> {
  const enabled = isDemoMode()
  const state = await readState()
  const resetMinutes = demoResetMinutes()
  const [products, orders, customers] = await Promise.all([
    db.product.count().catch(() => 0),
    db.order.count().catch(() => 0),
    db.user.count({ where: { role: 'CUSTOMER' } }).catch(() => 0)
  ])
  const lastActivity = state?.lastActivity || null
  const nextResetAt = lastActivity
    ? new Date(new Date(lastActivity).getTime() + resetMinutes * 60_000).toISOString()
    : null

  return {
    enabled,
    resetMinutes,
    lastActivity,
    lastReset: state?.lastReset || null,
    nextResetAt,
    resets: state?.resets || 0,
    counts: { products, orders, customers },
    adminEmail: demoAdminEmail(),
    defaultPassword: usesDefaultDemoPassword() ? demoAdminPassword() : null,
    ai: {
      configured: !!(process.env.AI_API_KEY || process.env.OPENAI_API_KEY),
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    }
  }
}
