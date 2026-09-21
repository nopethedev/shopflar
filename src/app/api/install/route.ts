// /api/install — one-time setup endpoint
// Creates the first admin user, store settings, and optionally seeds demo data.
// Only works if no admin user exists yet (security: prevents takeover).

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'

export async function POST(req) {
  try {
    // Security check: refuse if any admin already exists
    const adminCount = await db.user.count({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    })
    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Setup already complete. An admin user exists. Sign in instead.' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { storeName, storeEmail, adminEmail, adminPassword, adminName, loadDemoData, currency } = body

    // Validate
    if (!storeName) return NextResponse.json({ error: 'Store name required' }, { status: 400 })
    if (!storeEmail || !storeEmail.includes('@')) return NextResponse.json({ error: 'Valid store email required' }, { status: 400 })
    if (!adminEmail || !adminEmail.includes('@')) return NextResponse.json({ error: 'Valid admin email required' }, { status: 400 })
    if (!adminPassword || adminPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // 1. Create admin user (Super Admin)
    const adminUser = await db.user.create({
      data: {
        email: adminEmail.toLowerCase().trim(),
        passwordHash: hashPassword(adminPassword),
        name: adminName || 'Store Admin',
        role: 'SUPER_ADMIN',
        emailVerified: new Date(),
        profile: {
          create: adminName ? {
            firstName: adminName.split(' ')[0],
            lastName: adminName.split(' ').slice(1).join(' ') || null
          } : {}
        }
      }
    })

    // 2. Update store settings
    const settings = [
      ['store_name', storeName],
      ['store_title', `${storeName} — Modern Online Store`],
      ['store_email', storeEmail.toLowerCase().trim()],
      ['store_description', `${storeName} — built on Shopflar.`],
      ['currency', currency || 'USD'],
      ['currency_symbol', currencySymbol(currency || 'USD')],
      ['footer_text', `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`],
      // Enable COD by default so checkout works immediately
      ['payment_cod_enabled', 'true'],
      ['payment_stripe_enabled', 'false'],
      ['payment_paypal_enabled', 'false'],
      ['payment_paypal_standard_enabled', 'false'],
      // Hero defaults
      ['hero_image', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop'],
      ['hero_title', 'New Season, New Essentials'],
      ['hero_subtitle', 'Curated products designed to last — built for everyday use, made for the way you live now.'],
      ['hero_button_text', 'Shop the Collection'],
      ['hero_button_url', '/products']
    ]
    for (const [key, value] of settings) {
      await db.storeSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      }).catch(() => {})
    }

    // 3. Optionally load demo data
    let demoDataLoaded = false
    if (loadDemoData) {
      try {
        // Inline demo data loader (lightweight version of seed.js)
        await loadDemoDataInline()
        demoDataLoaded = true
      } catch (e) {
        console.error('Demo data load failed:', e.message)
      }
    }

    // 4. Mark install as complete
    await db.storeSetting.upsert({
      where: { key: 'install_complete' },
      update: { value: 'true' },
      create: { key: 'install_complete', value: 'true' }
    })

    // 5. Create session so they don't need to log in again
    await createSession(adminUser)

    return NextResponse.json({
      ok: true,
      admin: { email: adminUser.email, role: adminUser.role },
      demoDataLoaded
    })
  } catch (e) {
    console.error('Install error:', e)
    return NextResponse.json(
      { error: e.message || 'Installation failed' },
      { status: 500 }
    )
  }
}

function currencySymbol(currency) {
  const symbols = { USD: '$', EUR: '€', GBP: '£', CAD: '$', AUD: '$', JPY: '¥' }
  return symbols[currency] || '$'
}

// Inline demo data loader — same as scripts/seed.js but without the admin user
// (since the install wizard creates the admin)
async function loadDemoDataInline() {
  const { scryptSync, randomBytes } = await import('crypto')

  // Categories
  const categories = []
  for (const c of [
    { name: 'Apparel', slug: 'apparel', description: 'Clothing for every season', sortOrder: 1 },
    { name: 'T-Shirts', slug: 't-shirts', description: 'Soft, durable everyday tees', sortOrder: 2 },
    { name: 'Hoodies', slug: 'hoodies', description: 'Cozy layering for cold days', sortOrder: 3 },
    { name: 'Accessories', slug: 'accessories', description: 'Hats, bags, and small goods', sortOrder: 4 },
    { name: 'Footwear', slug: 'footwear', description: 'Sneakers and shoes', sortOrder: 5 }
  ]) {
    categories.push(await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c }))
  }
  const [apparel, tshirts, hoodies, accessories, footwear] = categories
  await db.category.update({ where: { slug: 't-shirts' }, data: { parentId: apparel.id } }).catch(() => {})

  // Products
  const products = [
    {
      name: 'Everyday Cotton Tee', slug: 'everyday-cotton-tee',
      shortDescription: 'A soft, breathable cotton tee that goes with everything.',
      description: '<p>Our Everyday Cotton Tee is made from 100% organic combed cotton with a relaxed fit and a classic crew neckline. Pre-shrunk and garment-washed for that perfectly broken-in feel from day one.</p>',
      price: 32.00, compareAtPrice: 45.00, sku: 'TEE-COT-001', barcode: '08400012345',
      inventoryQty: 240, featured: true, categories: [tshirts.id, apparel.id],
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'S / Black', options: { Size: 'S', Color: 'Black' }, sku: 'TEE-COT-001-S-BK', inventoryQty: 40 },
        { name: 'M / Black', options: { Size: 'M', Color: 'Black' }, sku: 'TEE-COT-001-M-BK', inventoryQty: 60 },
        { name: 'L / Black', options: { Size: 'L', Color: 'Black' }, sku: 'TEE-COT-001-L-BK', inventoryQty: 50 },
        { name: 'M / White', options: { Size: 'M', Color: 'White' }, sku: 'TEE-COT-001-M-WH', inventoryQty: 50 },
        { name: 'L / White', options: { Size: 'L', Color: 'White' }, sku: 'TEE-COT-001-L-WH', inventoryQty: 40 }
      ], weight: 0.2, tags: ['cotton', 'organic', 'unisex', 'everyday']
    },
    {
      name: 'Heavyweight Oversized Hoodie', slug: 'heavyweight-oversized-hoodie',
      shortDescription: 'Fleece-lined hoodie with a relaxed, oversized silhouette.',
      description: '<p>A 400gsm fleece-lined hoodie with double-lined hood, ribbed cuffs, and a front kangaroo pocket. Designed to be worn oversized for that lived-in streetwear look.</p>',
      price: 89.00, compareAtPrice: 110.00, sku: 'HOOD-HVY-001', inventoryQty: 120, featured: true,
      categories: [hoodies.id, apparel.id],
      images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'S / Charcoal', options: { Size: 'S', Color: 'Charcoal' }, sku: 'HOOD-HVY-001-S-CH', inventoryQty: 20 },
        { name: 'M / Charcoal', options: { Size: 'M', Color: 'Charcoal' }, sku: 'HOOD-HVY-001-M-CH', inventoryQty: 30 },
        { name: 'L / Charcoal', options: { Size: 'L', Color: 'Charcoal' }, sku: 'HOOD-HVY-001-L-CH', inventoryQty: 25 }
      ], weight: 0.7, tags: ['hoodie', 'heavyweight', 'fleece', 'oversized']
    },
    {
      name: 'Court Classic Sneaker', slug: 'court-classic-sneaker',
      shortDescription: 'Low-top leather sneaker with a vulcanized rubber sole.',
      description: '<p>A minimal court-style sneaker in full-grain leather with a vulcanized rubber sole. Memory-foam insole for all-day comfort.</p>',
      price: 128.00, compareAtPrice: 145.00, sku: 'SNKR-CRT-001', inventoryQty: 60, featured: true, categories: [footwear.id],
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'US 9 / White', options: { Size: 'US 9', Color: 'White' }, sku: 'SNKR-CRT-001-9-WH', inventoryQty: 10 },
        { name: 'US 10 / White', options: { Size: 'US 10', Color: 'White' }, sku: 'SNKR-CRT-001-10-WH', inventoryQty: 15 },
        { name: 'US 11 / White', options: { Size: 'US 11', Color: 'White' }, sku: 'SNKR-CRT-001-11-WH', inventoryQty: 12 }
      ], weight: 0.9, tags: ['sneakers', 'footwear', 'leather', 'court']
    },
    {
      name: 'Wool Felt Dad Hat', slug: 'wool-felt-dad-hat',
      shortDescription: 'Unstructured wool-blend dad hat with brass buckle.',
      description: '<p>A six-panel unstructured dad hat made from a wool-blend felt.</p>',
      price: 38.00, sku: 'HAT-DAD-001', inventoryQty: 4, lowStockThreshold: 10, featured: false, categories: [accessories.id],
      images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&auto=format&fit=crop'],
      variants: [{ name: 'One Size / Black', options: { Size: 'One Size', Color: 'Black' }, sku: 'HAT-DAD-001-OS-BK', inventoryQty: 4 }],
      weight: 0.15, tags: ['hat', 'accessories', 'dad-hat', 'wool']
    }
  ]

  for (const p of products) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } })
    if (existing) continue
    const { categories: catIds, images, variants, tags, ...prod } = p
    await db.product.create({
      data: {
        ...prod,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        currency: 'USD',
        trackInventory: true,
        isOutOfStock: prod.inventoryQty === 0,
        categories: { create: catIds.map((cid) => ({ categoryId: cid })) },
        images: { create: images.map((url, i) => ({ url, sortOrder: i, altText: prod.name })) },
        variants: { create: variants.map(v => ({ ...v, options: JSON.stringify(v.options) })) },
        tags: tags ? { create: tags.map((t) => ({ tag: t })) } : undefined
      }
    })
  }

  // Shipping methods
  for (const sm of [
    { id: 'standard-free', name: 'Standard Shipping', description: '3-5 business days', price: 0, freeShippingThreshold: 75, countries: '["US","CA"]', estimatedDays: '3-5', sortOrder: 1 },
    { id: 'express', name: 'Express Shipping', description: '1-2 business days', price: 18.50, countries: '["US","CA"]', estimatedDays: '1-2', sortOrder: 2 },
    { id: 'international', name: 'International Shipping', description: '7-14 business days', price: 32.00, countries: 'ALL', estimatedDays: '7-14', sortOrder: 3 }
  ]) {
    await db.shippingMethod.upsert({ where: { id: sm.id }, update: {}, create: sm }).catch(() => {})
  }

  // Tax rates
  for (const tr of [
    { country: 'US', region: 'CA', rate: 8.5, name: 'California' },
    { country: 'US', region: 'NY', rate: 8.0, name: 'New York' },
    { country: 'US', region: 'TX', rate: 6.25, name: 'Texas' },
    { country: 'CA', rate: 5.0, name: 'Canada GST' },
    { country: 'GB', rate: 20.0, name: 'UK VAT' },
    { country: 'AU', rate: 10.0, name: 'Australia GST' }
  ]) {
    await db.taxRate.create({ data: tr }).catch(() => {})
  }

  // Discounts
  for (const d of [
    { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) },
    { code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }
  ]) {
    await db.discount.upsert({ where: { code: d.code }, update: {}, create: d }).catch(() => {})
  }
}
