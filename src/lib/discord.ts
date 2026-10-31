// Discord webhook notifications
//
// Sends store events (new order, payment received, low stock, ...) to a
// Discord channel via an Incoming Webhook. Configuration lives in the DB:
//   discord_enabled      'true' | 'false'
//   discord_webhook_url  https://discord.com/api/webhooks/...
//   discord_events       JSON array of enabled event keys (['order.placed', ...])
//
// Design rules:
// - Notifications are strictly fire-and-forget: a Discord outage must never
//   break checkout, orders or emails.
// - Failures are written to the audit log so they show up on Admin → Logs.
// - discord.* actions are never re-notified (no recursion).

import { db } from './db'

let cache = null
let cacheAt = 0
const CACHE_TTL = 30000 // 30s

// Event catalog: key → { label, emoji, color } used to build the embed.
// Callers can pass extra fields; anything unknown renders as a plain field.
export const DISCORD_EVENTS = {
  'order.placed':        { label: 'New order placed',      emoji: '🛒', color: 0x3b82f6 },
  'order.paid':          { label: 'Payment received',      emoji: '💰', color: 0x22c55e },
  'order.status_changed':{ label: 'Order status updated',  emoji: '📦', color: 0x8b5cf6 },
  'order.refunded':      { label: 'Order refunded',        emoji: '↩️', color: 0xef4444 },
  'order.fulfilled':     { label: 'Order fulfilled',       emoji: '📮', color: 0x14b8a6 },
  'user.registered':     { label: 'New customer registered', emoji: '👋', color: 0x3b82f6 },
  'user.verified':       { label: 'Email verified',        emoji: '✅', color: 0x22c55e },
  'review.created':      { label: 'New review submitted',  emoji: '⭐', color: 0xeab308 },
  'stock.low':           { label: 'Low stock alert',       emoji: '⚠️', color: 0xf97316 },
  'email.failed':        { label: 'Email failed to send',  emoji: '✉️', color: 0xef4444 },
  'dice.won':            { label: 'Dice game won',         emoji: '🎲', color: 0xf59e0b },
  'settings.updated':    { label: 'Settings changed',      emoji: '⚙️', color: 0x6b7280 }
}

const DEFAULT_EVENTS = [
  'order.placed', 'order.paid', 'order.status_changed', 'order.refunded',
  'user.registered', 'stock.low', 'email.failed', 'dice.won'
]

export async function getDiscordConfig() {
  const now = Date.now()
  if (cache && now - cacheAt < CACHE_TTL) return cache

  const rows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'discord_' } }
  }).catch(() => [])
  const map = new Map(rows.map(r => [r.key, r.value]))

  let events = DEFAULT_EVENTS
  try {
    const parsed = JSON.parse(map.get('discord_events') || 'null')
    if (Array.isArray(parsed) && parsed.length > 0) events = parsed
  } catch { /* keep defaults */ }

  cache = {
    enabled: map.get('discord_enabled') === 'true',
    webhookUrl: map.get('discord_webhook_url') || '',
    events,
  }
  cacheAt = now
  return cache
}

export function invalidateDiscordCache() {
  cache = null
}

// Format a metadata object into Discord embed fields (max 25 fields, values
// max 1024 chars per Discord limits). Money-like keys get a $ prefix.
function metadataToFields(metadata) {
  if (!metadata || typeof metadata !== 'object') return []
  const fields = []
  for (const [k, v] of Object.entries(metadata)) {
    if (v == null || v === '' || typeof v === 'object') continue
    const name = k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
    const value = String(v).slice(0, 1024)
    fields.push({ name: name.slice(0, 256), value, inline: true })
    if (fields.length >= 24) break
  }
  return fields
}

export async function sendDiscordEvent(action, metadata = {}) {
  try {
    const config = await getDiscordConfig()
    if (!config.enabled || !config.webhookUrl) return { sent: false, reason: 'disabled' }
    if (action.startsWith('discord.')) return { sent: false, reason: 'no-recursion' }
    if (!config.events.includes(action)) return { sent: false, reason: 'event-not-enabled' }

    const def = DISCORD_EVENTS[action] || { label: action, emoji: '🔔', color: 0x6b7280 }
    const embed = {
      title: `${def.emoji} ${def.label}`,
      color: def.color,
      fields: metadataToFields(metadata),
      timestamp: new Date().toISOString(),
      footer: { text: 'Shopflar' }
    }

    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Shopflar',
        embeds: [embed]
      }),
      signal: AbortSignal.timeout(8000)
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Discord webhook responded ${res.status}: ${text.slice(0, 200)}`)
    }
    return { sent: true }
  } catch (e) {
    // Never propagate — but do leave a trace in the activity log.
    console.error('[DISCORD] Notification failed:', e.message)
    db.auditLog.create({
      data: {
        action: 'discord.failed',
        entity: 'discord',
        metadata: JSON.stringify({ event: action, error: String(e.message || e).slice(0, 500) })
      }
    }).catch(() => {})
    return { sent: false, error: e.message }
  }
}

// Send a test notification (Admin → Notifications → Send test message)
export async function sendDiscordTest(webhookUrl) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Shopflar',
      embeds: [{
        title: '✅ Test notification from Shopflar',
        description: 'If you can read this, your Discord webhook is working. You will receive store events in this channel.',
        color: 0x22c55e,
        timestamp: new Date().toISOString(),
        footer: { text: 'Shopflar' }
      }]
    }),
    signal: AbortSignal.timeout(8000)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Discord responded ${res.status} — check the webhook URL. ${text.slice(0, 200)}`)
  }
  return true
}
