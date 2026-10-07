import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
    const rows = await db.storeSetting.findMany({
      where: { key: { startsWith: 'tracking_' } }
    })
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return NextResponse.json({ settings })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith('tracking_')) {
        await db.storeSetting.upsert({
          where: { key },
          update: { value: String(value || '') },
          create: { key, value: String(value || '') }
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
