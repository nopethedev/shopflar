import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const data = {}
    if (body.config !== undefined) data.config = body.config
    if (body.isVisible !== undefined) data.isVisible = !!body.isVisible
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0
    const updated = await db.pageSection.update({ where: { id }, data })
    return NextResponse.json({ section: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.pageSection.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
