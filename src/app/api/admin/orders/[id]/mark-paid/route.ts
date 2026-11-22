import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { markOrderPaid } from '@/lib/services/orders'
import { logEvent } from '@/lib/logs'

// Confirm an offline payment (crypto wallet transfer, bank transfer, COD
// collected…). Runs the same post-payment flow as an online payment:
// payment record, digital fulfillment, confirmation email.
export async function POST(_req, { params }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const order = await db.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.paymentStatus === 'PAID') return NextResponse.json({ ok: true, alreadyPaid: true })
    if (['CANCELLED', 'REFUNDED', 'FAILED'].includes(order.status)) {
      return NextResponse.json({ error: `A ${order.status.toLowerCase()} order cannot be marked paid` }, { status: 400 })
    }
    await markOrderPaid(order.id, order.paymentProvider || 'manual', `manual_${Date.now()}`)
    await logEvent('order.updated', {
      actorId: admin.id, actorEmail: admin.email, entity: 'order', entityId: order.id,
      metadata: { orderNumber: order.orderNumber, change: 'marked paid manually' }, notify: false
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
