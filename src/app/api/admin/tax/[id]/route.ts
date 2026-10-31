import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()
    const updated = await db.taxRate.update({
      where: { id: params.id },
      data: {
        ...(body.country != null ? { country: body.country } : {}),
        ...(body.region !== undefined ? { region: body.region || null } : {}),
        ...(body.rate != null ? { rate: Number(body.rate) } : {}),
        ...(body.name !== undefined ? { name: body.name || null } : {}),
        ...(body.isActive != null ? { isActive: !!body.isActive } : {})
      }
    })
    return NextResponse.json({ rate: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    await db.taxRate.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
