import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const FIELDS = [
  'business_name', 'business_legal_name', 'business_registration_number', 'business_vat_number',
  'business_address_line1', 'business_address_line2', 'business_city', 'business_state',
  'business_postal_code', 'business_country', 'business_phone',
  // EU compliance fields
  'business_legal_form', 'business_share_capital', 'business_representatives',
  'business_supervising_authority',
  'business_responsible_person_name', 'business_responsible_person_address',
  'business_responsible_person_email', 'business_responsible_person_phone',
  'business_lucid_number', 'business_oss_number', 'business_ioss_number'
]

export async function PATCH(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    // Map camelCase keys from the form to snake_case DB keys
    const keyMap = {
      legalForm: 'business_legal_form',
      shareCapital: 'business_share_capital',
      representatives: 'business_representatives',
      supervisingAuthority: 'business_supervising_authority',
      responsiblePersonName: 'business_responsible_person_name',
      responsiblePersonAddress: 'business_responsible_person_address',
      responsiblePersonEmail: 'business_responsible_person_email',
      responsiblePersonPhone: 'business_responsible_person_phone',
      lucidNumber: 'business_lucid_number',
      ossNumber: 'business_oss_number',
      iosNumber: 'business_ioss_number'
    }

    for (const [formKey, value] of Object.entries(body)) {
      // Convert camelCase to snake_case or use direct mapping
      let dbKey
      if (keyMap[formKey]) {
        dbKey = keyMap[formKey]
      } else if (formKey.startsWith('business_')) {
        dbKey = formKey
      } else {
        // Try to convert camelCase to snake_case with business_ prefix
        const snakeKey = 'business_' + formKey.replace(/([A-Z])/g, '_$1').toLowerCase()
        if (FIELDS.includes(snakeKey)) {
          dbKey = snakeKey
        }
      }

      if (dbKey && FIELDS.includes(dbKey)) {
        await db.storeSetting.upsert({
          where: { key: dbKey },
          update: { value: String(value || '') },
          create: { key: dbKey, value: String(value || '') }
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
