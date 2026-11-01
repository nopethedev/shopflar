import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { renderNewsletterEmail } from '@/lib/newsletter'
import { getStoreSettings, getAppUrl } from '@/lib/settings'

const BATCH_SIZE = 10
const DELAY_MS = 150 // gentle pace between individual emails

// POST /api/admin/newsletter/campaigns/[id]/batch
// Delivers the next chunk of pending recipients. Called in a loop by the
// admin UI which shows live progress; safe to stop and resume any time.
export async function POST(req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params

    const campaign = await db.newsletterCampaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    if (campaign.status === 'draft') {
      return NextResponse.json({ error: 'Start the send first' }, { status: 400 })
    }

    const [settings, appUrl] = await Promise.all([getStoreSettings(), getAppUrl()])
    const batch = await db.newsletterRecipient.findMany({
      where: { campaignId: id, status: 'pending' },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' }
    })

    let sent = 0
    let failed = 0

    for (const recipient of batch) {
      // Resolve the unsubscribe link from the subscriber's private token
      const sub = await db.newsletterSubscriber.findUnique({
        where: { email: recipient.email },
        select: { token: true }
      })
      const unsubscribeUrl = sub
        ? `${appUrl}/unsubscribe?token=${encodeURIComponent(sub.token)}`
        : `${appUrl}/unsubscribe`

      const html = renderNewsletterEmail(campaign, {
        storeName: settings.storeName,
        logoUrl: settings.logoUrl,
        storeUrl: appUrl,
        unsubscribeUrl,
        addressText: settings.storeAddress
      })

      const result = await sendEmail({ to: recipient.email, subject: campaign.subject, html })

      await db.newsletterRecipient.update({
        where: { id: recipient.id },
        data: {
          status: result.success ? 'sent' : 'failed',
          error: result.success ? null : (result.error || 'Send failed').slice(0, 500),
          sentAt: new Date()
        }
      })

      if (result.success) sent++; else failed++
      if (DELAY_MS > 0) await new Promise(r => setTimeout(r, DELAY_MS))
    }

    const remaining = await db.newsletterRecipient.count({ where: { campaignId: id, status: 'pending' } })
    const sentCount = await db.newsletterRecipient.count({ where: { campaignId: id, status: 'sent' } })
    const failedCount = await db.newsletterRecipient.count({ where: { campaignId: id, status: 'failed' } })

    // Finalize when nothing is pending
    let status = campaign.status
    if (remaining === 0) {
      status = failedCount === 0 ? 'sent' : (sentCount > 0 ? 'partial' : 'failed')
      await db.newsletterCampaign.update({
        where: { id },
        data: { status, sentCount, failedCount, sentAt: campaign.sentAt || new Date() }
      })
    } else {
      await db.newsletterCampaign.update({
        where: { id },
        data: { status: 'sending', sentCount, failedCount }
      })
    }

    return NextResponse.json({
      ok: true,
      processed: batch.length,
      sent,
      failed,
      remaining,
      sentCount,
      failedCount,
      total: campaign.totalRecipients,
      done: remaining === 0,
      status
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
