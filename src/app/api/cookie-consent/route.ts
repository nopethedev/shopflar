import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

export async function POST(req) {
  try {
    const { consent, categories } = await req.json()
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || ''
    const ua = h.get('user-agent') || ''

    // Generate or reuse visitor ID
    const visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    await db.cookieConsent.upsert({
      where: { visitorId },
      update: {
        consent: consent || 'essential',
        categories: JSON.stringify(categories || ['essential']),
        ipAddress: ip,
        userAgent: ua.slice(0, 200)
      },
      create: {
        visitorId,
        consent: consent || 'essential',
        categories: JSON.stringify(categories || ['essential']),
        ipAddress: ip,
        userAgent: ua.slice(0, 200)
      }
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
