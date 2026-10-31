import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { setFulfillmentCredential } from '@/lib/fulfillment'

const SECRET_KEYS = new Set(['PRINTFUL_API_KEY', 'CJ_API_KEY'])
const PUBLIC_KEYS = new Set(['CJ_EMAIL'])

export async function GET() {
  try {
    await requireAdmin()
    const { getFulfillmentSettings } = await import('@/lib/fulfillment')
    const settings = await getFulfillmentSettings()
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
      // Handle auto-fulfillment toggle
      if (key === 'auto_enabled') {
        await db.storeSetting.upsert({
          where: { key: 'fulfillment_auto_enabled' },
          update: { value: String(value) },
          create: { key: 'fulfillment_auto_enabled', value: String(value) }
        })
        continue
      }

      // Handle enable/disable toggles
      if (key.startsWith('enabled_')) {
        await db.storeSetting.upsert({
          where: { key: `fulfillment_${key}` },
          update: { value: String(value) },
          create: { key: `fulfillment_${key}`, value: String(value) }
        })
        continue
      }

      // Handle credentials — skip mask placeholders
      if (value === '••••••••••••' || value === '') {
        if (SECRET_KEYS.has(key) && value === '') continue
        if (value === '••••••••••••') continue
      }

      // Save credential
      if (SECRET_KEYS.has(key) || PUBLIC_KEYS.has(key)) {
        await setFulfillmentCredential(key, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
