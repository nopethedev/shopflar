import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()
    const data = {}
    if (body.status) data.status = body.status
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null
    if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes || null
    if (body.status === 'SHIPPED' && body.trackingNumber) data.fulfillmentStatus = 'FULFILLED'
    if (body.status === 'DELIVERED') data.fulfillmentStatus = 'FULFILLED'
    if (body.status === 'CANCELLED') data.paymentStatus = 'REFUNDED'

    const updated = await db.order.update({ where: { id: params.id }, data })
    return NextResponse.json({ order: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    await db.order.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
