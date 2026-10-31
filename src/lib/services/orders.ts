// Order creation service — server-side authoritative
// NEVER trust prices from the client. Always look up from DB.

import { db } from '../db'
import { generateOrderNumber } from '../settings'
import { logEvent } from '../logs'

export async function calculateOrder({ items, discountCode, shippingMethodId, country, region }) {
  // 1. Resolve product prices from DB (never trust client)
  const productIds = [...new Set(items.map(it => it.productId))]
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true }
  })
  const productMap = new Map(products.map(p => [p.id, p]))

  let subtotal = 0
  const resolvedItems = []
  for (const it of items) {
    const product = productMap.get(it.productId)
    if (!product) throw new Error(`Product not found: ${it.productId}`)
    if (product.status !== 'PUBLISHED') throw new Error(`Product not available: ${product.name}`)
    if (product.isOutOfStock) throw new Error(`Product out of stock: ${product.name}`)

    let unitPrice = product.price
    let variant = null
    if (it.variantId) {
      variant = product.variants.find(v => v.id === it.variantId)
      if (!variant) throw new Error(`Variant not found for ${product.name}`)
      if (variant.price != null) unitPrice = variant.price
      if (variant.inventoryQty < it.quantity) {
        throw new Error(`Insufficient stock for ${product.name} (${variant.name})`)
      }
    } else if (product.trackInventory && product.inventoryQty < it.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`)
    }
    const lineTotal = unitPrice * it.quantity
    subtotal += lineTotal
    resolvedItems.push({
      productId: product.id,
      variantId: variant?.id || null,
      name: product.name,
      sku: variant?.sku || product.sku,
      variantName: variant?.name,
      price: unitPrice,
      quantity: it.quantity,
      imageUrl: product.images?.[0]?.url || null
    })
  }

  // 2. Resolve discount (server-side)
  let discountAmount = 0
  let freeShipping = false
  let appliedDiscount = null
  if (discountCode) {
    const d = await db.discount.findUnique({ where: { code: discountCode.toUpperCase() } })
    if (!d || !d.isActive) throw new Error('Invalid discount code')
    const now = new Date()
    if (d.startDate && d.startDate > now) throw new Error('Discount not yet active')
    if (d.endDate && d.endDate < now) throw new Error('Discount expired')
    if (d.usageLimit != null && d.usedCount >= d.usageLimit) throw new Error('Discount usage limit reached')
    if (d.minOrderAmount && subtotal < d.minOrderAmount) {
      throw new Error(`Minimum order amount of ${d.minOrderAmount} required`)
    }

    if (d.type === 'PERCENTAGE') {
      discountAmount = subtotal * (d.value / 100)
      if (d.maxDiscount) discountAmount = Math.min(discountAmount, d.maxDiscount)
    } else if (d.type === 'FIXED_AMOUNT') {
      discountAmount = Math.min(d.value, subtotal)
    } else if (d.type === 'FREE_SHIPPING') {
      freeShipping = true
    }
    appliedDiscount = { id: d.id, code: d.code, type: d.type, value: d.value }
  }

  // 3. Resolve shipping
  let shippingTotal = 0
  let shippingMethod = null
  if (shippingMethodId) {
    shippingMethod = await db.shippingMethod.findUnique({ where: { id: shippingMethodId } })
    if (!shippingMethod || !shippingMethod.isActive) throw new Error('Shipping method not available')
    // countries is a JSON array string; tolerate legacy raw "ALL" or comma lists
    let allowedCountries = []
    try {
      allowedCountries = JSON.parse(shippingMethod.countries || '["ALL"]')
      if (!Array.isArray(allowedCountries)) allowedCountries = [String(allowedCountries)]
    } catch {
      allowedCountries = String(shippingMethod.countries || 'ALL').split(',').map(s => s.trim()).filter(Boolean)
    }
    if (!allowedCountries.includes('ALL') && country && !allowedCountries.includes(country)) {
      throw new Error('Shipping method not available in your country')
    }
    shippingTotal = shippingMethod.price
    if (freeShipping || (shippingMethod.freeShippingThreshold && subtotal >= shippingMethod.freeShippingThreshold)) {
      shippingTotal = 0
    }
  }

  // 4. Tax calculation (server-side)
  let taxRate = 0
  const taxConfig = await db.taxRate.findFirst({
    where: {
      country,
      region: region || null,
      isActive: true
    }
  })
  if (taxConfig) taxRate = taxConfig.rate
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxTotal = +(taxableAmount * (taxRate / 100)).toFixed(2)

  // 5. Total
  const total = +(subtotal - discountAmount + shippingTotal + taxTotal).toFixed(2)

  return {
    items: resolvedItems,
    subtotal: +subtotal.toFixed(2),
    discountAmount: +discountAmount.toFixed(2),
    discountCode: appliedDiscount?.code || null,
    appliedDiscount,
    shippingMethod,
    shippingTotal: +shippingTotal.toFixed(2),
    taxRate,
    taxTotal,
    total
  }
}

export async function createOrder({ items, discountCode, shippingMethodId, customer, shippingAddress, paymentProvider }) {
  const calc = await calculateOrder({
    items,
    discountCode,
    shippingMethodId,
    country: shippingAddress.country,
    region: shippingAddress.state
  })

  // ============ Sale limit check ============
  const { getSaleLimitStatus } = await import('../settings')
  const saleLimit = await getSaleLimitStatus()
  if (saleLimit.enabled && saleLimit.exceeded) {
    throw new Error('Sale limit reached. New orders are temporarily disabled.')
  }

  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      email: customer.email,
      userId: customer.userId || null,
      status: 'PAYMENT_PENDING',
      paymentStatus: 'UNPAID',
      subtotal: calc.subtotal,
      discountTotal: calc.discountAmount,
      shippingTotal: calc.shippingTotal,
      taxTotal: calc.taxTotal,
      total: calc.total,
      currency: 'USD',
      discountCode: calc.discountCode,
      shippingMethod: calc.shippingMethod?.name || null,
      paymentProvider,
      shippingAddress,
      billingAddress: shippingAddress,
      items: {
        create: calc.items.map(it => ({
          productId: it.productId,
          variantId: it.variantId,
          name: it.name,
          sku: it.sku,
          variantName: it.variantName,
          price: it.price,
          quantity: it.quantity,
          imageUrl: it.imageUrl
        }))
      }
    },
    include: { items: true }
  })

  // Record discount usage
  if (calc.appliedDiscount) {
    await db.discount.update({
      where: { id: calc.appliedDiscount.id },
      data: { usedCount: { increment: 1 } }
    })
    await db.discountUsage.create({
      data: {
        discountId: calc.appliedDiscount.id,
        orderId: order.id,
        userId: customer.userId || null
      }
    }).catch(() => {})
  }

  // ============ Mystery Crate expansion ============
  // For each item that's a mystery crate, add the guaranteed + random items
  // and record what the customer won (shown as a reveal on the success page).
  try {
    const mysteryCrates = await db.mysteryCrate.findMany({
      where: { productId: { in: calc.items.map(it => it.productId) } },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } }
    })

    const reveals = []

    for (const crate of mysteryCrates) {
      const orderItem = order.items.find(it => it.productId === crate.productId)
      if (!orderItem) continue
      const crateQuantity = orderItem.quantity

      const guaranteed = JSON.parse(crate.guaranteedItems || '[]')
      const pool = JSON.parse(crate.poolItems || '[]')

      const reveal = {
        crateName: crate.product.name,
        crateImageUrl: crate.product.images?.[0]?.url || null,
        quantity: crateQuantity,
        guaranteed: [],
        surprises: []
      }

      // Add guaranteed items (multiplied by crate quantity)
      for (const g of guaranteed) {
        const product = await db.product.findUnique({
          where: { id: g.productId },
          select: { id: true, name: true, sku: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } }
        })
        if (!product) continue
        await db.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            name: `${product.name} (Mystery Crate — guaranteed)`,
            sku: product.sku,
            price: 0, // bonus item, no extra charge
            quantity: (g.quantity || 1) * crateQuantity,
            imageUrl: product.images?.[0]?.url || null
          }
        })
        reveal.guaranteed.push({
          name: product.name,
          imageUrl: product.images?.[0]?.url || null,
          quantity: (g.quantity || 1) * crateQuantity
        })
      }

      // Random picks from pool (weighted)
      if (pool.length > 0 && crate.poolSize > 0) {
        for (let q = 0; q < crateQuantity; q++) {
          for (let pick = 0; pick < crate.poolSize; pick++) {
            const totalWeight = pool.reduce((s, p) => s + (p.weight || 1), 0)
            if (totalWeight <= 0) break
            let rand = Math.random() * totalWeight
            let chosen = pool[0]
            for (const p of pool) {
              rand -= (p.weight || 1)
              if (rand <= 0) { chosen = p; break }
            }
            const product = await db.product.findUnique({
              where: { id: chosen.productId },
              select: { id: true, name: true, sku: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } }
            })
            if (!product) continue
            await db.orderItem.create({
              data: {
                orderId: order.id,
                productId: product.id,
                name: `${product.name} (Mystery Crate — surprise!)`,
                sku: product.sku,
                price: 0,
                quantity: 1,
                imageUrl: product.images?.[0]?.url || null
              }
            })
            reveal.surprises.push({
              name: product.name,
              imageUrl: product.images?.[0]?.url || null
            })
          }
        }
      }

      reveals.push(reveal)
    }

    if (reveals.length > 0) {
      await db.order.update({
        where: { id: order.id },
        data: { mysteryReveals: JSON.stringify(reveals) }
      }).catch((e) => console.error('Failed to save mystery reveal data:', e.message))
    }
  } catch (e) {
    console.error('Mystery crate expansion failed:', e.message)
    // Don't fail the order if mystery crate expansion fails
  }

  // Decrement inventory (and raise a stock.low event when a product crosses
  // its low-stock threshold — but only on the crossing, to avoid spam)
  for (const it of calc.items) {
    if (it.variantId) {
      const before = await db.productVariant.findUnique({
        where: { id: it.variantId },
        include: { product: { select: { lowStockThreshold: true } } }
      }).catch(() => null)
      await db.productVariant.update({
        where: { id: it.variantId },
        data: { inventoryQty: { decrement: it.quantity } }
      })
      if (before) {
        const remaining = before.inventoryQty - it.quantity
        const threshold = before.product?.lowStockThreshold ?? 5
        if (before.inventoryQty > threshold && remaining <= threshold) {
          await logEvent('stock.low', {
            entity: 'variant', entityId: it.variantId,
            metadata: { product: it.name, variant: it.variantName || '—', remaining }
          })
        }
      }
    } else {
      const before = await db.product.findUnique({
        where: { id: it.productId },
        select: { inventoryQty: true, lowStockThreshold: true }
      }).catch(() => null)
      await db.product.update({
        where: { id: it.productId },
        data: {
          inventoryQty: { decrement: it.quantity },
          isOutOfStock: false
        }
      })
      const p = await db.product.findUnique({ where: { id: it.productId } })
      if (p && p.inventoryQty <= 0) {
        await db.product.update({ where: { id: it.productId }, data: { isOutOfStock: true } })
      }
      if (before && p && before.inventoryQty > before.lowStockThreshold && p.inventoryQty <= before.lowStockThreshold) {
        await logEvent('stock.low', {
          entity: 'product', entityId: it.productId,
          metadata: { product: it.name, remaining: p.inventoryQty }
        })
      }
    }
  }

  // ============ Order placed event (activity log + Discord) ============
  await logEvent('order.placed', {
    entity: 'order',
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      total: `$${order.total.toFixed(2)}`,
      email: order.email,
      provider,
      items: calc.items.map(it => ({ name: it.name, quantity: it.quantity })),
      discountCode: calc.discountCode || null,
      shipping: calc.shippingMethod?.name || null
    }
  })

  return order
}

export async function markOrderPaid(orderId, provider, reference) {
  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      paymentStatus: 'PAID',
      paymentProvider: provider,
      paymentRef: reference
    },
    include: { items: true }
  })

  await db.payment.create({
    data: {
      orderId,
      provider,
      amount: order.total,
      status: 'SUCCEEDED',
      reference
    }
  })

  await logEvent('order.paid', {
    entity: 'order',
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      total: `$${order.total.toFixed(2)}`,
      email: order.email,
      provider,
      reference: reference || null
    }
  })

  // ============ Digital fulfillment ============
  // For downloadable + code products, deliver via email
  try {
    await fulfillDigitalProducts(order)
  } catch (e) {
    console.error('Digital fulfillment failed:', e.message)
  }

  // ============ Send order confirmation email ============
  // COD orders already received their confirmation email at placement (the
  // checkout route sends it, since there is no payment webhook for COD) —
  // don't send a second one when the cash is collected.
  if (order.paymentProvider !== 'cod') {
    try {
      const { sendOrderConfirmation } = await import('../email')
      await sendOrderConfirmation(order)
    } catch (e) {
      console.error('Order confirmation email failed:', e.message)
    }
  }

  // ============ Auto-fulfillment (Printful, CJ Dropshipping, etc.) ============
  try {
    const { autoFulfillOrder } = await import('../fulfillment')
    const results = await autoFulfillOrder(order)
    if (results.length > 0) {
      console.log(`[FULFILLMENT] Order ${order.orderNumber}: ${results.length} provider(s) processed`)
      await logEvent('order.fulfilled', {
        entity: 'order',
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          providers: results.map(r => ({ name: r.provider, ok: r.success })),
          errors: results.filter(r => !r.success).map(r => `${r.provider}: ${r.error}`).join('; ') || null
        }
      })
    }
  } catch (e) {
    console.error('Auto-fulfillment failed:', e.message)
  }

  return order
}

// ============ Digital product fulfillment ============
async function fulfillDigitalProducts(order) {
  const digitalItems = order.items.filter(it => {
    // We need to check the product type — fetch products
    return true
  })

  // Fetch the products to check their type
  const productIds = [...new Set(order.items.map(it => it.productId))]
  const products = await db.product.findMany({
    where: { id: { in: productIds } }
  })
  const productMap = new Map(products.map(p => [p.id, p]))

  for (const item of order.items) {
    const product = productMap.get(item.productId)
    if (!product) continue

    if (product.productType === 'downloadable' && product.downloadUrl) {
      // Create download fulfillment record
      const fulfillment = await db.orderFulfillment.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          productId: product.id,
          fulfillmentType: 'download_link',
          downloadUrl: product.downloadUrl,
          downloadLimit: product.downloadLimit || 0
        }
      })

      // Email customer the download link
      try {
        const { sendDigitalFulfillment } = await import('../email')
        await sendDigitalFulfillment(order, fulfillment)
      } catch (e) {
        console.error('Download email failed:', e.message)
      }
    }

    if (product.productType === 'code' && product.codePool) {
      // Pick a code from the pool (not already delivered)
      let pool = JSON.parse(product.codePool || '[]')
      let delivered = JSON.parse(product.codePoolDelivered || '[]')
      const available = pool.filter(c => !delivered.includes(c))

      for (let q = 0; q < item.quantity; q++) {
        if (available.length === 0) {
          console.warn(`Code pool exhausted for product ${product.id}`)
          break
        }
        const code = available.shift()
        delivered.push(code)

        const fulfillment = await db.orderFulfillment.create({
          data: {
            orderId: order.id,
            orderItemId: item.id,
            productId: product.id,
            fulfillmentType: 'code',
            code
          }
        })

        // Email customer the code
        try {
          const { sendDigitalFulfillment } = await import('../email')
          await sendDigitalFulfillment(order, fulfillment)
        } catch (e) {
          console.error('Code email failed:', e.message)
        }
      }

      // Update the product's delivered codes
      await db.product.update({
        where: { id: product.id },
        data: {
          codePoolDelivered: JSON.stringify(delivered),
          // Update inventory to reflect available codes
          inventoryQty: Math.max(0, pool.length - delivered.length),
          isOutOfStock: (pool.length - delivered.length) <= 0
        }
      })
    }
  }
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const previous = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true, orderNumber: true, email: true }
  })
  const data = { status }
  if (status === 'SHIPPED' && extra.trackingNumber) data.trackingNumber = extra.trackingNumber
  if (extra.internalNotes) data.internalNotes = extra.internalNotes
  if (status === 'DELIVERED') data.fulfillmentStatus = 'FULFILLED'
  if (status === 'CANCELLED') data.paymentStatus = 'REFUNDED'
  const updated = await db.order.update({ where: { id: orderId }, data })

  await logEvent('order.status_changed', {
    entity: 'order',
    entityId: orderId,
    metadata: {
      orderNumber: previous?.orderNumber || orderId,
      from: previous?.status || '—',
      to: status,
      email: previous?.email || null,
      trackingNumber: extra.trackingNumber || null
    }
  })

  return updated
}
