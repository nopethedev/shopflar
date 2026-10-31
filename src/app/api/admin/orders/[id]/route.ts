import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

export async function PATCH(req, { params }) {
  params = await params
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    const data = {}
    if (body.status) data.status = body.status
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null
    if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes || null
    if (body.status === 'SHIPPED' && body.trackingNumber) data.fulfillmentStatus = 'FULFILLED'
    if (body.status === 'DELIVERED') data.fulfillmentStatus = 'FULFILLED'
    if (body.status === 'CANCELLED') data.paymentStatus = 'REFUNDED'

    const previous = await db.order.findUnique({
      where: { id: params.id },
      select: { status: true, orderNumber: true }
    })
    const updated = await db.order.update({ where: { id: params.id }, data })

    if (body.status && previous && previous.status !== body.status) {
      await logEvent('order.status_changed', {
        actorId: admin.id, actorEmail: admin.email,
        entity: 'order', entityId: params.id,
        metadata: {
          orderNumber: updated.orderNumber,
          from: previous.status,
          to: body.status,
          trackingNumber: body.trackingNumber || null
        }
      })
    } else {
      await logEvent('order.updated', {
        actorId: admin.id, actorEmail: admin.email,
        entity: 'order', entityId: params.id,
        metadata: { orderNumber: updated.orderNumber, note: 'Tracking/notes updated' },
        notify: false
      })
    }

    return NextResponse.json({ order: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req, { params }) {
  params = await params
  try {
    const admin = await requireAdmin()
    const order = await db.order.findUnique({
      where: { id: params.id },
      select: { orderNumber: true, email: true, total: true }
    })
    await db.order.delete({ where: { id: params.id } })
    await logEvent('order.deleted', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'order', entityId: params.id,
      metadata: {
        orderNumber: order?.orderNumber || params.id,
        email: order?.email || null,
        total: order ? `$${order.total.toFixed(2)}` : null
      },
      notify: false
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
