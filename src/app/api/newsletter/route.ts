import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req) {
  try {
    const { email, name, source } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    const existing = await db.newsletterSubscriber.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ ok: true, alreadySubscribed: true })
    }
    await db.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || null,
        source: source || 'STOREFRONT'
      }
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
