// Mailchimp audience sync (App Library → Mailchimp sync). Best-effort: a
// Mailchimp outage must never block a newsletter signup.
import crypto from 'node:crypto'
import { getReadyApp } from '@/lib/apps'

export async function syncSubscriberToMailchimp(email: string, name?: string | null) {
  try {
    const app = await getReadyApp('mailchimp')
    if (!app) return
    const { apiKey, audienceId, tags } = app.config
    const dc = String(apiKey).split('-')[1]
    if (!dc || !/^[a-z0-9]+$/i.test(dc) || !/^[a-z0-9]+$/i.test(String(audienceId))) return
    const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex')
    const [first, ...rest] = String(name || '').trim().split(/\s+/)
    await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${hash}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`shopflar:${apiKey}`).toString('base64')}`
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        ...(first ? { merge_fields: { FNAME: first, LNAME: rest.join(' ') } } : {}),
        tags: String(tags || '').split(',').map(t => t.trim()).filter(Boolean)
      }),
      signal: AbortSignal.timeout(8000)
    })
  } catch (e) {
    console.error('Mailchimp sync failed:', e.message)
  }
}
