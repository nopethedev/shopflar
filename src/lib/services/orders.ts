// Order creation service — server-side authoritative
// NEVER trust prices from the client. Always look up from DB.

import { db } from '../db'
import { generateOrderNumber } from '../settings'

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
    const allowedCountries = JSON.parse(shippingMethod.countries || '["ALL"]')
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
  try {
    const mysteryCrates = await db.mysteryCrate.findMany({
      where: { productId: { in: calc.items.map(it => it.productId) } },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } }
    })

    for (const crate of mysteryCrates) {
      const orderItem = order.items.find(it => it.productId === crate.productId)
      if (!orderItem) continue
      const crateQuantity = orderItem.quantity

      const guaranteed = JSON.parse(crate.guaranteedItems || '[]')
      const pool = JSON.parse(crate.poolItems || '[]')

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
          }
        }
      }
    }
  } catch (e) {
    console.error('Mystery crate expansion failed:', e.message)
    // Don't fail the order if mystery crate expansion fails
  }

  // Decrement inventory
  for (const it of calc.items) {
    if (it.variantId) {
      await db.productVariant.update({
        where: { id: it.variantId },
        data: { inventoryQty: { decrement: it.quantity } }
      })
    } else {
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
    }
  }

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
    }
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

  return order
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const data = { status }
  if (status === 'SHIPPED' && extra.trackingNumber) data.trackingNumber = extra.trackingNumber
  if (extra.internalNotes) data.internalNotes = extra.internalNotes
  if (status === 'DELIVERED') data.fulfillmentStatus = 'FULFILLED'
  if (status === 'CANCELLED') data.paymentStatus = 'REFUNDED'
  return db.order.update({ where: { id: orderId }, data })
}
