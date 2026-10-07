import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendNewsletter } from '@/lib/email'

export async function POST(req) {
  try {
    await requireAdmin()
    const { subject, body } = await req.json()

    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and body required' }, { status: 400 })
    }

    const subscribers = await db.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { email: true }
    })

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    const result = await sendNewsletter(
      subject,
      body,
      subscribers.map(s => s.email)
    )

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
