import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

// GET /api/admin/newsletter/campaigns — list campaigns with progress counts
export async function GET() {
  try {
    await requireAdmin()
    const campaigns = await db.newsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { recipients: true } } }
    })
    // Live pending count per campaign (recipients not yet processed)
    const pending = await db.newsletterRecipient.groupBy({
      by: ['campaignId'],
      where: { status: 'pending' },
      _count: { _all: true }
    })
    const pendingMap = new Map(pending.map(p => [p.campaignId, p._count._all]))
    return NextResponse.json({
      campaigns: campaigns.map(c => ({
        ...c,
        blocks: undefined, // keep list payload light
        pendingCount: pendingMap.get(c.id) || 0
      }))
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/admin/newsletter/campaigns — create or update a draft.
// Sending is a separate action (POST .../send) so drafts can be saved freely.
export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()

    const data = {
      subject: String(body.subject || '').slice(0, 200) || 'Untitled campaign',
      preheader: String(body.preheader || '').slice(0, 300) || null,
      mode: body.mode === 'image' ? 'image' : 'blocks',
      blocks: body.mode === 'image' ? null : JSON.stringify(Array.isArray(body.blocks) ? body.blocks : []),
      imageUrl: body.mode === 'image' ? String(body.imageUrl || '') : null,
      clickUrl: body.mode === 'image' ? String(body.clickUrl || '') : null,
      imageAlt: body.mode === 'image' ? String(body.imageAlt || '') : null,
      accentColor: /^#[0-9a-fA-F]{6}$/.test(body.accentColor || '') ? body.accentColor : '#1a1a1a'
    }

    let campaign
    if (body.id) {
      // Only drafts (and never campaigns already fully sent) may be edited
      const existing = await db.newsletterCampaign.findUnique({ where: { id: body.id } })
      if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      if (existing.status === 'sent' || existing.status === 'partial') {
        return NextResponse.json({ error: 'This campaign was already sent and can no longer be edited' }, { status: 400 })
      }
      campaign = await db.newsletterCampaign.update({ where: { id: body.id }, data })
    } else {
      campaign = await db.newsletterCampaign.create({ data })
    }

    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'newsletter_campaign', entityId: campaign.id,
      metadata: { action: body.id ? 'draft_saved' : 'draft_created', subject: campaign.subject, mode: campaign.mode },
      notify: false
    })

    return NextResponse.json({ campaign })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
