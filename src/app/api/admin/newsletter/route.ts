import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  await requireAdmin()
  const subscribers = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ subscribers })
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
