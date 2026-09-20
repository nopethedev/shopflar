import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    for (const [key, value] of Object.entries(body)) {
      await db.storeSetting.upsert({
        where: { key },
        update: { value: String(value || '') },
        create: { key, value: String(value || '') }
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
