import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  try {
    await requireAdmin()
    const body = await req.json()
    const updated = await db.productReview.update({
      where: { id: params.id },
      data: {
        ...(body.isApproved !== undefined ? { isApproved: !!body.isApproved } : {}),
        ...(body.rating ? { rating: parseInt(body.rating) } : {}),
        ...(body.title !== undefined ? { title: body.title || null } : {}),
        ...(body.body !== undefined ? { body: body.body } : {})
      }
    })
    return NextResponse.json({ review: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  try {
    await requireAdmin()
    await db.productReview.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
