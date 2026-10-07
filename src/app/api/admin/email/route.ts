import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const ALLOWED_KEYS = new Set([
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
  'smtp_from_email', 'smtp_from_name', 'smtp_secure',
  'newsletter_welcome_enabled', 'newsletter_welcome_discount_percent',
  'newsletter_welcome_code_prefix',
  'newsletter_prompt_title', 'newsletter_prompt_subtitle'
])

export async function GET() {
  try {
    await requireAdmin()
    const rows = await db.storeSetting.findMany({
      where: { OR: [{ key: { startsWith: 'smtp_' } }, { key: { startsWith: 'newsletter_' } }] }
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
      if (ALLOWED_KEYS.has(key)) {
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
