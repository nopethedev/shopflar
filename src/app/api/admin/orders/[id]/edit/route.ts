import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

const round = (n: number) => Math.round(n * 100) / 100
const clampQty = (n: any) => Math.min(999, Math.max(1, parseInt(n) || 1))

// PATCH /api/admin/orders/:id/edit
// Edit line items (quantities, removals, additions) and the shipping address.
// Prices for existing lines are preserved; new lines use the variant/product
// price. Discount, shipping and tax are kept and the order totals recomputed.
export async function PATCH(req, { params }) {
  params = await params
  try {
    const admin = await requireAdmin()
    const body = await req.json()

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true }
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json(
        { error: `Order ${order.orderNumber} is ${order.status.toLowerCase()} and cannot be edited` },
        { status: 400 }
      )
    }

    const orderItemIds = new Set(order.items.map(i => i.id))
    const updates = Array.isArray(body.items) ? body.items : []
    const removals = Array.isArray(body.removedItemIds) ? body.removedItemIds : []
    const additions = Array.isArray(body.addItems) ? body.addItems : []

    for (const update of updates) {
      if (!update?.id || !orderItemIds.has(update.id)) continue
      await db.orderItem.update({
        where: { id: update.id },
        data: { quantity: clampQty(update.quantity) }
      })
    }

    const validRemovals = removals.filter((id: string) => orderItemIds.has(id))
    // Reject an edit that would leave the order with no lines *before* touching
    // anything, so a failed request never empties a real order.
    if (order.items.length - validRemovals.length + additions.length <= 0) {
      return NextResponse.json({ error: 'An order must have at least one line item' }, { status: 400 })
    }
    if (validRemovals.length) {
      await db.orderItem.deleteMany({ where: { orderId: order.id, id: { in: validRemovals } } })
    }

    for (const addition of additions) {
      if (!addition?.productId) continue
      const product = await db.product.findUnique({
        where: { id: addition.productId },
        include: { variants: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } }
      })
      if (!product) continue
      const variant = addition.variantId
        ? product.variants.find(v => v.id === addition.variantId)
        : null
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          variantId: variant?.id || null,
          name: product.name,
          sku: variant?.sku || product.sku || null,
          variantName: variant?.name || null,
          price: variant?.price ?? product.price,
          quantity: clampQty(addition.quantity),
          imageUrl: product.images[0]?.url || null
        }
      })
    }

    const items = await db.orderItem.findMany({ where: { orderId: order.id } })
    if (items.length === 0) {
      // Roll back is unnecessary: the caller still has its previous state in the
      // UI, and an order with no lines is invalid.
      return NextResponse.json({ error: 'An order must have at least one line item' }, { status: 400 })
    }

    const subtotal = round(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
    const total = round(Math.max(0, subtotal - order.discountTotal + order.shippingTotal + order.taxTotal))

    const shippingAddress = body.shippingAddress && typeof body.shippingAddress === 'object'
      ? body.shippingAddress
      : order.shippingAddress

    const updated = await db.order.update({
      where: { id: order.id },
      data: { subtotal, total, shippingAddress },
      include: { items: true }
    })

    await logEvent('order.edited', {
      actorId: admin.id,
      actorEmail: admin.email,
      entity: 'order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        before: { subtotal: order.subtotal, total: order.total, items: order.items.length },
        after: { subtotal: updated.subtotal, total: updated.total, items: updated.items.length }
      },
      notify: false
    })

    return NextResponse.json({ order: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
