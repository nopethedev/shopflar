import { db } from '@/lib/db'
import { logEvent } from '@/lib/logs'
import { NextResponse } from 'next/server'

// POST /api/unsubscribe — opt a subscriber out using their private token
export async function POST(req) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const sub = await db.newsletterSubscriber.findUnique({ where: { token: String(token) } })
    if (!sub) {
      return NextResponse.json({ error: 'This unsubscribe link is invalid or expired.' }, { status: 404 })
    }

    await db.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { isActive: false, unsubscribedAt: new Date() }
    })

    await logEvent('settings.updated', {
      entity: 'newsletter_subscriber', entityId: sub.id,
      metadata: { action: 'unsubscribed', email: sub.email },
      notify: false
    })

    return NextResponse.json({ ok: true, email: sub.email })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
