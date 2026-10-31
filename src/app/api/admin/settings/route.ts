import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

export async function GET() {
  try {
    await requireAdmin()
    const rows = await db.storeSetting.findMany()
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return NextResponse.json({ settings })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    for (const [key, value] of Object.entries(body)) {
      await db.storeSetting.upsert({
        where: { key },
        update: { value: String(value || '') },
        create: { key, value: String(value || '') }
      })
    }
    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'settings',
      metadata: { keys: Object.keys(body).slice(0, 15).join(', ') },
      notify: false
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
