import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req) {
  try {
    await requireAdmin()
    const { key, content } = await req.json()
    if (!key || !key.startsWith('legal_')) {
      // Wrap key with legal_ prefix if not already
      const fullKey = key.startsWith('legal_') ? key : `legal_${key}`
      await db.storeSetting.upsert({
        where: { key: fullKey },
        update: { value: String(content || '') },
        create: { key: fullKey, value: String(content || '') }
      })
    } else {
      await db.storeSetting.upsert({
        where: { key },
        update: { value: String(content || '') },
        create: { key, value: String(content || '') }
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const rows = await db.storeSetting.findMany({
      where: { key: { startsWith: 'legal_' } }
    })
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return NextResponse.json({ settings })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
