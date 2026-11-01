import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

// POST /api/admin/newsletter/campaigns/[id]/send
// Starts (or resumes) a send: snapshots the active subscriber list into
// pending recipient rows. Actual delivery happens in batches via /batch —
// the admin UI loops that endpoint so progress is visible and a closed
// browser never loses the campaign (it can always be resumed).
export async function POST(req, { params }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    const campaign = await db.newsletterCampaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    if (campaign.mode === 'image' && !campaign.imageUrl) {
      return NextResponse.json({ error: 'Upload a newsletter image first' }, { status: 400 })
    }
    if (campaign.mode === 'blocks') {
      let blocks = []
      try { blocks = JSON.parse(campaign.blocks || '[]') } catch { blocks = [] }
      if (blocks.length === 0) {
        return NextResponse.json({ error: 'Add at least one content block first' }, { status: 400 })
      }
    }

    // Backfill unsubscribe tokens for legacy subscribers (rows created
    // before tokens existed) so every email gets a working opt-out link.
    const tokenless = await db.newsletterSubscriber.findMany({
      where: { isActive: true, token: null },
      select: { id: true }
    })
    for (const t of tokenless) {
      await db.newsletterSubscriber.update({
        where: { id: t.id },
        data: { token: crypto.randomUUID() }
      })
    }

    const subscribers = await db.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { email: true }
    })
    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    // Fresh start: drop old recipient rows (resume keeps them)
    const pendingBefore = await db.newsletterRecipient.count({ where: { campaignId: id, status: 'pending' } })
    if (pendingBefore === 0 || campaign.status === 'draft') {
      await db.newsletterRecipient.deleteMany({ where: { campaignId: id } })
      await db.newsletterRecipient.createMany({
        data: subscribers.map(s => ({ campaignId: id, email: s.email, status: 'pending' }))
      })
    }

    const total = await db.newsletterRecipient.count({ where: { campaignId: id } })
    const alreadySent = await db.newsletterRecipient.count({ where: { campaignId: id, status: 'sent' } })

    await db.newsletterCampaign.update({
      where: { id },
      data: { status: 'sending', totalRecipients: total, sentAt: new Date() }
    })

    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'newsletter_campaign', entityId: id,
      metadata: { action: campaign.status === 'sending' ? 'send_resumed' : 'send_started', subject: campaign.subject, recipients: total },
      notify: false
    })

    return NextResponse.json({ ok: true, total, alreadySent, remaining: total - alreadySent })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
