import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const FIELDS = [
  'business_name', 'business_legal_name', 'business_registration_number', 'business_vat_number',
  'business_address_line1', 'business_address_line2', 'business_city', 'business_state',
  'business_postal_code', 'business_country', 'business_phone'
]

export async function PATCH(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    for (const [key, value] of Object.entries(body)) {
      if (FIELDS.includes(key)) {
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
