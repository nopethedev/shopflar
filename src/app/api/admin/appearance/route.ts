import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'
import { invalidateAppearanceCache } from '@/lib/settings'

export async function GET() {
  try {
    await requireAdmin()
    const rows = await db.appearanceSetting.findMany()
    const settings = {}
    rows.forEach(r => { settings[r.key] = r.value })
    return NextResponse.json({ settings })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    const keys = Object.keys(body)
    for (const [key, value] of Object.entries(body)) {
      await db.appearanceSetting.upsert({
        where: { key },
        update: { value: String(value || '') },
        create: { key, value: String(value || '') }
      })
    }
    invalidateAppearanceCache()

    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'appearance',
      metadata: { keys: keys.slice(0, 12) },
      notify: false
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
