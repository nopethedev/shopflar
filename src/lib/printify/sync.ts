// Printify <-> local catalog synchronization service
import { db } from '../db'
import { printify, PrintifyError } from './client'

export async function syncPrintifyShops() {
  if (!printify.isConfigured) throw new PrintifyError('Printify not configured', 400)
  const shops = await printify.listShops()
  for (const shop of shops) {
    await db.printifyShop.upsert({
      where: { shopId: String(shop.id) },
      update: { name: shop.title },
      create: { shopId: String(shop.id), name: shop.title }
    })
  }
  return shops
}

export async function listPrintifyProducts(shopId, page = 1, limit = 50) {
  if (!printify.isConfigured) throw new PrintifyError('Printify not configured', 400)
  return printify.listProducts(shopId, { page, limit })
}

export async function importPrintifyProduct(shopId, printifyProductId) {
  if (!printify.isConfigured) throw new PrintifyError('Printify not configured', 400)
  const p = await printify.getProduct(shopId, printifyProductId)

  // Check existing link
  const existing = await db.printifyProductLink.findUnique({
    where: { printifyProductId: String(printifyProductId) }
  })

  if (existing) {
    // Update existing product
    const updated = await db.product.update({
      where: { id: existing.productId },
      data: {
        name: p.title,
        description: p.description,
        ...(p.images?.[0]?.src ? {} : {}),
        ...(p.variants?.length ? {
          variants: {
            updateMany: p.variants.filter(v => v.is_enabled).map(v => ({
              where: { sku: v.sku },
              data: { inventoryQty: v.cost || 0 }
            }))
          }
        } : {})
      }
    })
    await db.printifyProductLink.update({
      where: { printifyProductId: String(printifyProductId) },
      data: { lastSyncedAt: new Date() }
    })
    return { product: updated, linked: true }
  }

  // Create new product
  const slug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-5)
  const product = await db.product.create({
    data: {
      name: p.title,
      slug,
      description: p.description,
      shortDescription: (p.description || '').replace(/<[^>]+>/g, '').slice(0, 160),
      price: parseFloat(p.variants?.find(v => v.is_enabled)?.price || '0'),
      sku: p.variants?.[0]?.sku,
      inventoryQty: 100,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      currency: 'USD',
      images: {
        create: (p.images || []).map((img, i) => ({
          url: img.src,
          altText: p.title,
          sortOrder: i
        }))
      },
      variants: {
        create: (p.variants || []).filter(v => v.is_enabled).map(v => ({
          name: v.title,
          options: JSON.stringify(v.options || {}),
          sku: v.sku,
          price: parseFloat(v.price),
          inventoryQty: 100
        }))
      },
      printifyLink: {
        create: {
          printifyProductId: String(printifyProductId),
          printifyShopId: String(shopId),
          lastSyncedAt: new Date()
        }
      }
    }
  })
  return { product, linked: false }
}

export async function pushOrderToPrintify(shopId, order) {
  if (!printify.isConfigured) return null
  const payload = {
    external_id: order.id,
    shipping_method: 1,
    line_items: order.items.map(it => {
      // Look up linked Printify variant
      // Note: in a full impl we'd resolve via the variantLink table.
      return {
        printify_variant_id: parseInt(it.printifyVariantId || '0', 10),
        quantity: it.quantity
      }
    }).filter(it => it.printify_variant_id > 0),
    shipping_address: {
      first_name: order.shippingAddress?.firstName,
      last_name: order.shippingAddress?.lastName,
      email: order.email,
      phone: order.shippingAddress?.phone || '',
      country: order.shippingAddress?.country,
      region: order.shippingAddress?.state,
      address1: order.shippingAddress?.address1,
      address2: order.shippingAddress?.address2 || '',
      zip: order.shippingAddress?.postalCode,
      city: order.shippingAddress?.city
    }
  }
  if (!payload.line_items.length) return null
  const result = await printify.submitOrder(shopId, payload)
  await db.order.update({
    where: { id: order.id },
    data: { printifyOrderId: result.id }
  })
  return result
}

export async function linkLocalProductToPrintify(productId, printifyProductId, shopId) {
  await db.printifyProductLink.upsert({
    where: { productId },
    update: { printifyProductId: String(printifyProductId), printifyShopId: String(shopId), lastSyncedAt: new Date() },
    create: { productId, printifyProductId: String(printifyProductId), printifyShopId: String(shopId), lastSyncedAt: new Date() }
  })
}

// Pull fulfillment status + tracking from Printify into a local order.
// Printify order shape: { id, status, shipments: [{ carrier, number, url, ... }] }
export async function syncPrintifyTracking(orderId) {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) throw new PrintifyError('Order not found', 404)
  if (!order.printifyOrderId) throw new PrintifyError('This order is not linked to Printify', 400)

  // Find which shop the order belongs to (first active shop)
  const shop = await db.printifyShop.findFirst({ where: { isActive: true } })
  if (!shop) throw new PrintifyError('No Printify shop connected', 400)

  const pf = await printify.getOrder(shop.shopId, order.printifyOrderId)
  const shipments = Array.isArray(pf.shipments) ? pf.shipments : []

  const data = { trackingUpdatedAt: new Date() }
  if (shipments.length) {
    // Prefer the most recent shipment that has a tracking number
    const s = [...shipments].reverse().find(x => x.number) || shipments[0]
    if (s.number) {
      data.trackingNumber = String(s.number)
      data.trackingCarrier = s.carrier ? String(s.carrier) : 'Printify'
      data.trackingUrl = s.url || null
    }
  }

  // Map Printify order status -> local fulfillment
  const pfStatus = String(pf.status || '').toLowerCase()
  if (pfStatus === 'fulfilled' || pfStatus === 'shipped' || shipments.length > 0) {
    if (order.fulfillmentStatus !== 'DELIVERED') data.fulfillmentStatus = 'SHIPPED'
    if (['PAID', 'PROCESSING', 'PENDING', 'PAYMENT_PENDING'].includes(order.status)) data.status = 'SHIPPED'
  } else if (pfStatus === 'in production' && order.fulfillmentStatus === 'UNFULFILLED') {
    data.fulfillmentStatus = 'PROCESSING'
  }

  const updated = await db.order.update({ where: { id: orderId }, data })
  return {
    order: updated,
    shipments: shipments.map(s => ({ carrier: s.carrier, number: s.number, url: s.url })),
    printifyStatus: pf.status || pfStatus
  }
}

// Sync every order that was pushed to Printify and isn't final yet.
export async function syncAllPrintifyTracking() {
  const orders = await db.order.findMany({
    where: {
      printifyOrderId: { not: null },
      status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'] }
    },
    select: { id: true }
  })
  const results = []
  for (const { id } of orders) {
    try {
      const r = await syncPrintifyTracking(id)
      results.push({ orderId: id, ok: true, trackingNumber: r.order.trackingNumber, shipments: r.shipments.length })
    } catch (e) {
      results.push({ orderId: id, ok: false, error: e.message })
    }
  }
  return results
}
