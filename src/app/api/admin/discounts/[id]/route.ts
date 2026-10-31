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
    if (body.isActive != null) data.isActive = !!body.isActive
    if (body.value != null) data.value = Number(body.value)
    if (body.usageLimit != null) data.usageLimit = body.usageLimit ? parseInt(body.usageLimit) : null
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null
    const updated = await db.discount.update({ where: { id: params.id }, data })
    await logEvent('discount.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'discount', entityId: params.id,
      metadata: { code: updated.code, isActive: updated.isActive, value: updated.value },
      notify: false
    })
    return NextResponse.json({ discount: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    const admin = await requireAdmin()
    const existing = await db.discount.findUnique({ where: { id: params.id }, select: { code: true } })
    await db.discount.delete({ where: { id: params.id } })
    await logEvent('discount.deleted', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'discount', entityId: params.id,
      metadata: { code: existing?.code || params.id },
      notify: false
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
