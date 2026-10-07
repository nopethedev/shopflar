import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req, { params }) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { slug } = await params

    const updated = await db.plugin.upsert({
      where: { slug },
      update: { enabled: !!body.enabled },
      create: { slug, name: slug, enabled: !!body.enabled }
    })
    return NextResponse.json({ plugin: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
