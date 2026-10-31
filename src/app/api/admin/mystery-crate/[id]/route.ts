import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()
    const updated = await db.mysteryCrate.update({
      where: { id: params.id },
      data: {
        ...(body.guaranteedItems !== undefined ? { guaranteedItems: body.guaranteedItems } : {}),
        ...(body.poolItems !== undefined ? { poolItems: body.poolItems } : {}),
        ...(body.poolSize != null ? { poolSize: parseInt(body.poolSize) || 1 } : {}),
        ...(body.showOdds !== undefined ? { showOdds: !!body.showOdds } : {})
      }
    })
    return NextResponse.json({ crate: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    await db.mysteryCrate.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
