import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

export async function GET() {
  await requireAdmin()
  const subscribers = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ subscribers })
}

// POST — manually add subscribers (from the admin form or CSV import)
// Body: { add: ['a@b.com', ...], source?: 'ADMIN' }
export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    const emails = Array.isArray(body.add) ? body.add : []
    const source = typeof body.source === 'string' && body.source ? body.source.slice(0, 40) : 'ADMIN'

    let added = 0
    let skipped = 0
    for (const raw of emails.slice(0, 5000)) {
      const email = String(raw || '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { skipped++; continue }
      try {
        await db.newsletterSubscriber.create({ data: { email, source } })
        added++
      } catch {
        // Already exists — skip quietly (keep existing subscription state)
        skipped++
      }
    }

    if (added > 0) {
      await logEvent('settings.updated', {
        actorId: admin.id, actorEmail: admin.email,
        entity: 'newsletter_subscriber',
        metadata: { action: 'added', count: added, source },
        notify: false
      })
    }

    return NextResponse.json({ ok: true, added, skipped })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req) {
  try {
    await requireAdmin()
    const { id } = await req.json()
    await db.newsletterSubscriber.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
