// Seed script — generates demo products, categories, admin user, settings
// Compatible with both Node.js and Bun (CommonJS)
const { PrismaClient } = require('@prisma/client')
const { scryptSync, randomBytes } = require('crypto')

const db = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding database...')

  const adminEmail = 'admin@shopflar.dev'
  const adminPassword = 'admin12345'
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      name: 'Store Admin',
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
      profile: { create: { firstName: 'Store', lastName: 'Admin' } }
    }
  })
  console.log(`Admin: ${adminEmail} / ${adminPassword}`)

  const customer = await db.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
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

  const categories = await Promise.all([
    db.category.upsert({ where: { slug: 'apparel' }, update: {}, create: { name: 'Apparel', slug: 'apparel', description: 'Clothing for every season', sortOrder: 1 } }),
    db.category.upsert({ where: { slug: 't-shirts' }, update: {}, create: { name: 'T-Shirts', slug: 't-shirts', description: 'Soft, durable everyday tees', sortOrder: 2 } }),
    db.category.upsert({ where: { slug: 'hoodies' }, update: {}, create: { name: 'Hoodies & Sweatshirts', slug: 'hoodies', description: 'Cozy layering for cold days', sortOrder: 3 } }),
    db.category.upsert({ where: { slug: 'accessories' }, update: {}, create: { name: 'Accessories', slug: 'accessories', description: 'Hats, bags, and small goods', sortOrder: 4 } }),
    db.category.upsert({ where: { slug: 'footwear' }, update: {}, create: { name: 'Footwear', slug: 'footwear', description: 'Sneakers, boots, and sandals', sortOrder: 5 } })
  ])

  const [apparel, tshirts, hoodies, accessories, footwear] = categories
  await db.category.update({ where: { slug: 't-shirts' }, data: { parentId: apparel.id } }).catch(() => {})

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
        { name: 'L / Charcoal', options: { Size: 'L', Color: 'Charcoal' }, sku: 'HOOD-HVY-001-L-CH', inventoryQty: 25 },
        { name: 'M / Cream', options: { Size: 'M', Color: 'Cream' }, sku: 'HOOD-HVY-001-M-CR', inventoryQty: 25 },
        { name: 'L / Cream', options: { Size: 'L', Color: 'Cream' }, sku: 'HOOD-HVY-001-L-CR', inventoryQty: 20 }
      ], weight: 0.7, tags: ['hoodie', 'heavyweight', 'fleece', 'oversized']
    },
    {
      name: 'Relaxed Linen Shirt', slug: 'relaxed-linen-shirt',
      shortDescription: 'Lightweight, breathable linen shirt with a relaxed cut.',
      description: '<p>Crafted from 100% European flax linen, this shirt is pre-washed for softness and finished with mother-of-pearl buttons. A versatile piece that works as well over a tee as it does buttoned up.</p>',
      price: 78.00, sku: 'SHRT-LIN-001', inventoryQty: 60, featured: false, categories: [apparel.id],
      images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'S / Sand', options: { Size: 'S', Color: 'Sand' }, sku: 'SHRT-LIN-001-S-SD', inventoryQty: 15 },
        { name: 'M / Sand', options: { Size: 'M', Color: 'Sand' }, sku: 'SHRT-LIN-001-M-SD', inventoryQty: 20 },
        { name: 'L / Sand', options: { Size: 'L', Color: 'Sand' }, sku: 'SHRT-LIN-001-L-SD', inventoryQty: 15 },
        { name: 'M / Navy', options: { Size: 'M', Color: 'Navy' }, sku: 'SHRT-LIN-001-M-NV', inventoryQty: 10 }
      ], weight: 0.3, tags: ['linen', 'summer', 'shirt']
    },
    {
      name: 'Twill Cargo Pant', slug: 'twill-cargo-pant',
      shortDescription: 'Mid-weight cotton twill cargos with six pockets.',
      description: '<p>A modern take on the classic cargo, these twill pants offer six functional pockets, a tapered leg, and a comfortable mid-rise waist. Pre-washed for softness and reduced shrinkage.</p>',
      price: 95.00, compareAtPrice: 120.00, sku: 'PANT-CGO-001', inventoryQty: 80, featured: true, categories: [apparel.id],
      images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=800&auto=format&fit=crop'],
      variants: [
        { name: '30 / Olive', options: { Size: '30', Color: 'Olive' }, sku: 'PANT-CGO-001-30-OL', inventoryQty: 15 },
        { name: '32 / Olive', options: { Size: '32', Color: 'Olive' }, sku: 'PANT-CGO-001-32-OL', inventoryQty: 20 },
        { name: '34 / Olive', options: { Size: '34', Color: 'Olive' }, sku: 'PANT-CGO-001-34-OL', inventoryQty: 15 },
        { name: '32 / Black', options: { Size: '32', Color: 'Black' }, sku: 'PANT-CGO-001-32-BK', inventoryQty: 15 },
        { name: '34 / Black', options: { Size: '34', Color: 'Black' }, sku: 'PANT-CGO-001-34-BK', inventoryQty: 15 }
      ], weight: 0.6, tags: ['cargo', 'pants', 'twill', 'utility']
    },
    {
      name: 'Wool Felt Dad Hat', slug: 'wool-felt-dad-hat',
      shortDescription: 'Unstructured wool-blend dad hat with brass buckle.',
      description: '<p>A six-panel unstructured dad hat made from a wool-blend felt. Features an adjustable leather strap with a brass buckle closure.</p>',
      price: 38.00, sku: 'HAT-DAD-001', inventoryQty: 4, lowStockThreshold: 10, featured: false, categories: [accessories.id],
      images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1517941823-815bea90d291?w=800&auto=format&fit=crop'],
      variants: [{ name: 'One Size / Black', options: { Size: 'One Size', Color: 'Black' }, sku: 'HAT-DAD-001-OS-BK', inventoryQty: 4 }],
      weight: 0.15, tags: ['hat', 'accessories', 'dad-hat', 'wool']
    },
    {
      name: 'Canvas Weekender Bag', slug: 'canvas-weekender-bag',
      shortDescription: 'Waxed canvas weekender with leather trim.',
      description: '<p>A 40L weekender duffel made from waxed cotton canvas with full-grain leather trim and brass hardware. Plenty of room for a long weekend trip.</p>',
      price: 165.00, sku: 'BAG-WKD-001', inventoryQty: 35, featured: true, categories: [accessories.id],
      images: ['https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'One Size / Tan', options: { Size: 'One Size', Color: 'Tan' }, sku: 'BAG-WKD-001-OS-TN', inventoryQty: 20 },
        { name: 'One Size / Olive', options: { Size: 'One Size', Color: 'Olive' }, sku: 'BAG-WKD-001-OS-OL', inventoryQty: 15 }
      ], weight: 1.2, tags: ['bag', 'accessories', 'travel', 'canvas']
    },
    {
      name: 'Court Classic Sneaker', slug: 'court-classic-sneaker',
      shortDescription: 'Low-top leather sneaker with a vulcanized rubber sole.',
      description: '<p>A minimal court-style sneaker in full-grain leather with a vulcanized rubber sole. Memory-foam insole for all-day comfort.</p>',
      price: 128.00, compareAtPrice: 145.00, sku: 'SNKR-CRT-001', inventoryQty: 60, featured: true, categories: [footwear.id],
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'US 9 / White', options: { Size: 'US 9', Color: 'White' }, sku: 'SNKR-CRT-001-9-WH', inventoryQty: 10 },
        { name: 'US 10 / White', options: { Size: 'US 10', Color: 'White' }, sku: 'SNKR-CRT-001-10-WH', inventoryQty: 15 },
        { name: 'US 11 / White', options: { Size: 'US 11', Color: 'White' }, sku: 'SNKR-CRT-001-11-WH', inventoryQty: 12 },
        { name: 'US 10 / Black', options: { Size: 'US 10', Color: 'Black' }, sku: 'SNKR-CRT-001-10-BK', inventoryQty: 13 },
        { name: 'US 11 / Black', options: { Size: 'US 11', Color: 'Black' }, sku: 'SNKR-CRT-001-11-BK', inventoryQty: 10 }
      ], weight: 0.9, tags: ['sneakers', 'footwear', 'leather', 'court']
    },
    {
      name: 'Merino Crew Sweater', slug: 'merino-crew-sweater',
      shortDescription: 'Fine-gauge extra-fine merino wool sweater.',
      description: '<p>Knitted from 19.5 micron extra-fine merino wool for next-to-skin softness without the itch. Ribbed crew neck, cuffs, and hem.</p>',
      price: 110.00, sku: 'SWTR-MER-001', inventoryQty: 0, featured: false, categories: [apparel.id],
      images: ['https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800&auto=format&fit=crop', 'https://images.unsplash.com/photo-1638183391618-beb8db3da26b?w=800&auto=format&fit=crop'],
      variants: [
        { name: 'M / Charcoal', options: { Size: 'M', Color: 'Charcoal' }, sku: 'SWTR-MER-001-M-CH', inventoryQty: 0 },
        { name: 'L / Charcoal', options: { Size: 'L', Color: 'Charcoal' }, sku: 'SWTR-MER-001-L-CH', inventoryQty: 0 },
        { name: 'M / Camel', options: { Size: 'M', Color: 'Camel' }, sku: 'SWTR-MER-001-M-CM', inventoryQty: 0 }
      ], weight: 0.5, tags: ['merino', 'wool', 'sweater', 'knit']
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
    console.log(`Created product: ${p.name}`)
  }

  // Shipping methods
  for (const sm of [
    { id: 'standard-free', name: 'Standard Shipping', description: '3-5 business days', price: 0, freeShippingThreshold: 75, countries: '["US","CA"]', estimatedDays: '3-5', sortOrder: 1 },
    { id: 'express', name: 'Express Shipping', description: '1-2 business days', price: 18.50, countries: '["US","CA"]', estimatedDays: '1-2', sortOrder: 2 },
    { id: 'international', name: 'International Shipping', description: '7-14 business days', price: 32.00, countries: '["ALL"]', estimatedDays: '7-14', sortOrder: 3 }
  ]) {
    await db.shippingMethod.upsert({ where: { id: sm.id }, update: {}, create: sm })
  }

  // Tax rates
  for (const tr of [
    { country: 'US', region: 'CA', rate: 8.5, name: 'California' },
    { country: 'US', region: 'NY', rate: 8.0, name: 'New York' },
    { country: 'US', region: 'TX', rate: 6.25, name: 'Texas' },
    { country: 'US', region: 'FL', rate: 6.0, name: 'Florida' },
    { country: 'CA', rate: 5.0, name: 'Canada GST' },
    { country: 'GB', rate: 20.0, name: 'UK VAT' },
    { country: 'DE', rate: 19.0, name: 'Germany VAT' },
    { country: 'FR', rate: 20.0, name: 'France VAT' },
    { country: 'AU', rate: 10.0, name: 'Australia GST' }
  ]) {
    await db.taxRate.create({ data: tr }).catch(() => {})
  }

  // Discounts
  for (const d of [
    { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrderAmount: 0, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) },
    { code: 'SAVE25', type: 'PERCENTAGE', value: 25, minOrderAmount: 150, maxDiscount: 75, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) },
    { code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }
  ]) {
    await db.discount.upsert({ where: { code: d.code }, update: {}, create: d })
  }

  // Settings
  const settings = [
    ['store_name', 'Shopflar'], ['store_title', 'Shopflar — Modern Apparel & Lifestyle'],
    ['store_description', 'A modern clothing and lifestyle store built on a self-hostable ecommerce platform.'],
    ['store_email', 'hello@shopflar.dev'], ['store_phone', '+1 415 555 0100'], ['store_address', 'San Francisco, CA'],
    ['currency', 'USD'], ['currency_symbol', '$'], ['logo_url', ''], ['favicon_url', ''],
    ['footer_text', '© 2026 Shopflar. All rights reserved.'],
    ['social_twitter', 'https://twitter.com/shopflar'], ['social_instagram', 'https://instagram.com/shopflar'],
    ['social_facebook', 'https://facebook.com/shopflar'], ['social_tiktok', 'https://tiktok.com/@shopflar'],
    ['hero_image', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop'],
    ['hero_title', 'New Season, New Essentials'],
    ['hero_subtitle', 'Curated apparel and accessories designed to last — built for everyday wear, made for the way you live now.'],
    ['hero_button_text', 'Shop the Collection'], ['hero_button_url', '/products'],
    ['featured_section_title', 'Featured Products'], ['featured_section_subtitle', 'Hand-picked favorites from our latest drop.'],
    ['new_arrivals_title', 'New Arrivals'],
    ['newsletter_title', 'Get 10% off your first order'],
    ['newsletter_subtitle', 'Subscribe to our newsletter for early access to new drops, exclusive offers, and styling tips.']
  ]
  for (const [key, value] of settings) {
    await db.storeSetting.upsert({ where: { key }, update: {}, create: { key, value } })
  }

  const appearance = [
    ['primary_color', '#1a1a1a'], ['secondary_color', '#6b7280'], ['accent_color', '#d97706'],
    ['background_color', '#ffffff'], ['text_color', '#1a1a1a'], ['button_style', 'rounded'],
    ['font_family', 'Inter'], ['heading_font', 'Display'], ['card_radius', '0.75rem'], ['container_max_width', '1280px']
  ]
  for (const [key, value] of appearance) {
    await db.appearanceSetting.upsert({ where: { key }, update: {}, create: { key, value } })
  }

  // Demo orders
  const firstProduct = await db.product.findFirst()
  if (firstProduct) {
    const demoOrders = [
      { orderNumber: '#01001', email: 'customer@example.com', userId: customer.id, status: 'DELIVERED', paymentStatus: 'PAID', items: [{ name: 'Everyday Cotton Tee', sku: 'TEE-COT-001-M-BK', price: 32.00, quantity: 2, variantName: 'M / Black' }, { name: 'Wool Felt Dad Hat', sku: 'HAT-DAD-001-OS-BK', price: 38.00, quantity: 1, variantName: 'One Size / Black' }], subtotal: 102.00, shippingTotal: 0, taxTotal: 8.67, total: 110.67, paymentProvider: 'stripe', shippingAddress: { firstName: 'Demo', lastName: 'Customer', address1: '123 Market St', city: 'San Francisco', state: 'CA', postalCode: '94103', country: 'US' }, daysAgo: 1 },
      { orderNumber: '#01002', email: 'jane@example.com', status: 'SHIPPED', paymentStatus: 'PAID', items: [{ name: 'Heavyweight Oversized Hoodie', sku: 'HOOD-HVY-001-L-CH', price: 89.00, quantity: 1, variantName: 'L / Charcoal' }], subtotal: 89.00, shippingTotal: 0, taxTotal: 7.56, total: 96.56, paymentProvider: 'paypal', shippingAddress: { firstName: 'Jane', lastName: 'Doe', address1: '456 Oak Ave', city: 'Austin', state: 'TX', postalCode: '73301', country: 'US' }, daysAgo: 2 },
      { orderNumber: '#01003', email: 'mark@example.com', status: 'PENDING', paymentStatus: 'UNPAID', items: [{ name: 'Court Classic Sneaker', sku: 'SNKR-CRT-001-10-WH', price: 128.00, quantity: 1, variantName: 'US 10 / White' }], subtotal: 128.00, shippingTotal: 0, taxTotal: 8.00, total: 136.00, shippingAddress: { firstName: 'Mark', lastName: 'Smith', address1: '789 Pine Rd', city: 'Miami', state: 'FL', postalCode: '33101', country: 'US' }, daysAgo: 3 }
    ]
    for (const o of demoOrders) {
      const existing = await db.order.findUnique({ where: { orderNumber: o.orderNumber } })
      if (existing) continue
      await db.order.create({
        data: {
          orderNumber: o.orderNumber, email: o.email, userId: o.userId || null, status: o.status, paymentStatus: o.paymentStatus,
          subtotal: o.subtotal, shippingTotal: o.shippingTotal, taxTotal: o.taxTotal, total: o.total, currency: 'USD',
          shippingMethod: 'Standard Shipping', paymentProvider: o.paymentProvider,
          shippingAddress: o.shippingAddress, billingAddress: o.shippingAddress,
          createdAt: new Date(Date.now() - o.daysAgo * 24 * 60 * 60 * 1000),
          items: { create: o.items.map(it => ({ name: it.name, sku: it.sku, variantName: it.variantName, price: it.price, quantity: it.quantity, productId: firstProduct.id })) }
        }
      })
    }
  }

  await db.newsletterSubscriber.createMany({
    data: [
      { email: 'subscriber1@example.com' },
      { email: 'subscriber2@example.com', name: 'Sub Two' },
      { email: 'customer@example.com', name: 'Demo Customer' }
    ]
  }).catch(() => {})

  console.log('Seed complete.')
  console.log('Admin login: admin@shopflar.dev / admin12345')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
