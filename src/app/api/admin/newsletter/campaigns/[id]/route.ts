import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/newsletter/campaigns/[id] — campaign detail + recipient summary
export async function GET(req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const campaign = await db.newsletterCampaign.findUnique({
      where: { id },
      include: { _count: { select: { recipients: true } } }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const [pending, recipientsSample] = await Promise.all([
      db.newsletterRecipient.count({ where: { campaignId: id, status: 'pending' } }),
      db.newsletterRecipient.findMany({
        where: { campaignId: id },
        orderBy: { sentAt: 'desc' },
        take: 50
      })
    ])

    return NextResponse.json({
      campaign: { ...campaign, pendingCount: pending },
      recipientsSample
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// PATCH — rename/edit a campaign (kept for compatibility; main editing is POST /campaigns)
export async function PATCH(req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const existing = await db.newsletterCampaign.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (existing.status === 'sent' || existing.status === 'partial') {
      return NextResponse.json({ error: 'Already-sent campaigns cannot be edited' }, { status: 400 })
    }
    const data = {}
    if (typeof body.subject === 'string') data.subject = body.subject.slice(0, 200) || 'Untitled campaign'
    if (typeof body.preheader === 'string') data.preheader = body.preheader.slice(0, 300) || null
    const campaign = await db.newsletterCampaign.update({ where: { id }, data })
    return NextResponse.json({ campaign })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE — remove a campaign and its recipient rows
export async function DELETE(req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.newsletterCampaign.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
