// Endpoint: /api/admin/payments/credentials
// GET  - returns credential values (secrets are masked)
// PATCH - saves credential values (server-side only)

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { setCredential, listCredentials } from '@/lib/payments'

// Sensitive keys — never return the actual value, only whether they're set
const SECRET_KEYS = new Set([
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PAYPAL_CLIENT_SECRET',
  'PRINTIFY_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
])

// Public keys — safe to return to the admin UI
const PUBLIC_KEYS = new Set([
  'STRIPE_PUBLISHABLE_KEY',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_MODE',
  'PAYPAL_IPN_URL',
  'PAYPAL_EMAIL'
])

export async function GET() {
  try {
    await requireAdmin()
    const allCreds = await listCredentials()
    const credentials = {}
    for (const [key, value] of allCreds.entries()) {
      if (SECRET_KEYS.has(key)) {
        // Return empty string — admin must re-enter to update
        credentials[key] = value ? '••••••••••••' : ''
      } else {
        credentials[key] = value
      }
    }
    // Always include all known keys with empty defaults for the form
    for (const k of [...SECRET_KEYS, ...PUBLIC_KEYS]) {
      if (!(k in credentials)) credentials[k] = ''
    }
    return NextResponse.json({ credentials })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req) {
  try {
    await requireAdmin()
    const body = await req.json()

    // Save each credential — skip ones that are still the mask placeholder
    for (const [key, value] of Object.entries(body)) {
      // If user submitted the mask back (didn't change it), skip
      if (value === '••••••••••••' || value === '') {
        // Don't overwrite existing secret with empty
        if (value === '••••••••••••') continue
        // For empty values, allow clearing only non-secret fields
        if (SECRET_KEYS.has(key)) continue
      }
      await setCredential(key, value)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
