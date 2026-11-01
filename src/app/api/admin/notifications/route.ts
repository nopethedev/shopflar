import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { getDiscordConfig, invalidateDiscordCache, sendDiscordTest, DISCORD_EVENTS } from '@/lib/discord'
import { logEvent } from '@/lib/logs'

// GET /api/admin/notifications — Discord webhook config + event catalog
export async function GET() {
  try {
    await requireAdmin()
    const config = await getDiscordConfig()
    return NextResponse.json({
      enabled: config.enabled,
      webhookUrl: config.webhookUrl,
      events: config.events,
      catalog: DISCORD_EVENTS
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/admin/notifications — save Discord settings
// Body: { enabled, webhookUrl, events: [...] }
export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json().catch(() => ({}))

    const enabled = !!body.enabled
    const webhookUrl = String(body.webhookUrl || '').trim()
    if (webhookUrl && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(webhookUrl)) {
      return NextResponse.json({ error: 'That doesn\'t look like a Discord webhook URL (expected https://discord.com/api/webhooks/...)' }, { status: 400 })
    }

    // Only allow known event keys
    let events = Object.keys(DISCORD_EVENTS)
    if (Array.isArray(body.events)) {
      events = body.events.filter(k => DISCORD_EVENTS[k])
    }

    const upsert = (key, value) => db.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })

    await Promise.all([
      upsert('discord_enabled', enabled ? 'true' : 'false'),
      upsert('discord_webhook_url', webhookUrl),
      upsert('discord_events', JSON.stringify(events))
    ])
    invalidateDiscordCache()

    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'settings',
      metadata: { section: 'notifications.discord', enabled, eventsCount: events.length },
      notify: false
    })

    return NextResponse.json({ ok: true, enabled, webhookUrl, events })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// PUT /api/admin/notifications — send a test message to the saved webhook
export async function PUT() {
  try {
    const admin = await requireAdmin()
    const config = await getDiscordConfig()
    if (!config.webhookUrl) {
      return NextResponse.json({ error: 'No webhook URL saved yet. Paste it and click Save first.' }, { status: 400 })
    }
    try {
      await sendDiscordTest(config.webhookUrl)
    } catch (e) {
      await logEvent('discord.failed', {
        actorId: admin.id, actorEmail: admin.email,
        entity: 'discord',
        metadata: { event: 'test', error: String(e.message).slice(0, 300) }
      })
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    await logEvent('discord.test', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'discord',
      metadata: { result: 'Test message delivered' },
      notify: false
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
