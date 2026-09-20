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
