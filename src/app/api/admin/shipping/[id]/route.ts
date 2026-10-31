import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()
    const updated = await db.shippingMethod.update({
      where: { id: params.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.price != null ? { price: Number(body.price) } : {}),
        ...(body.freeShippingThreshold !== undefined ? { freeShippingThreshold: body.freeShippingThreshold ? Number(body.freeShippingThreshold) : null } : {}),
        ...(body.countries != null ? { countries: body.countries } : {}),
        ...(body.estimatedDays !== undefined ? { estimatedDays: body.estimatedDays || null } : {}),
        ...(body.isActive != null ? { isActive: !!body.isActive } : {}),
        ...(body.sortOrder != null ? { sortOrder: parseInt(body.sortOrder) || 0 } : {})
      }
    })
    return NextResponse.json({ method: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    await db.shippingMethod.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
