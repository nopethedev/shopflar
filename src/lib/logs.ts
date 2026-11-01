// Unified event logging
//
// One call site helper that does two things:
//   1. Persists the event to the AuditLog table (Admin → Logs → Activity)
//   2. Fans the event out to Discord when the webhook is configured and the
//      event is enabled (Admin → Notifications)
//
// Usage:
//   await logEvent('order.placed', {
//     entity: 'order', entityId: order.id,
//     metadata: { orderNumber: order.orderNumber, total: order.total, email: order.email }
//   })
//
// With an authenticated actor (admin routes):
//   const admin = await requireAdmin()
//   await logEvent('product.updated', { actorId: admin.id, actorEmail: admin.email, ... })
//
// logEvent NEVER throws — logging must not break the main flow.

import { db } from './db'
import { sendDiscordEvent } from './discord'

export async function logEvent(action, { actorId = null, actorEmail = null, entity = null, entityId = null, metadata = null, notify = true } = {}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actorId || null,
        actorEmail: actorEmail || null,
        action,
        entity: entity || null,
        entityId: entityId || null,
        metadata: metadata ? safeJson(metadata) : null
      }
    })
  } catch (e) {
    console.error('[LOGS] Failed to write audit log:', e.message)
  }

  if (notify) {
    // Fire-and-forget: don't let Discord latency/errors affect the caller.
    // Build a flat, embed-friendly metadata copy for the webhook.
    try {
      await sendDiscordEvent(action, flattenMetadata(metadata))
    } catch { /* sendDiscordEvent already catches internally */ }
  }
}

function safeJson(obj) {
  try {
    const s = JSON.stringify(obj)
    return s.length > 8000 ? s.slice(0, 8000) + '...[truncated]' : s
  } catch {
    return JSON.stringify({ note: 'unserializable metadata' })
  }
}

// Discord embeds can't render nested objects/arrays — flatten the interesting
// parts (items arrays become "name x2, name x1" strings, addresses join).
function flattenMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata
  const out = {}
  for (const [k, v] of Object.entries(metadata)) {
    if (v == null) continue
    if (typeof v === 'object' && !Array.isArray(v)) {
      out[k] = Object.values(v).filter(x => typeof x !== 'object').join(' ').slice(0, 300) || undefined
    } else if (Array.isArray(v)) {
      if (v.length === 0) continue
      out[k] = v.map(it => (typeof it === 'object' && it !== null)
        ? [it.name, it.quantity ? `x${it.quantity}` : null].filter(Boolean).join(' ')
        : String(it)
      ).join(', ').slice(0, 1000)
    } else {
      out[k] = v
    }
  }
  return out
}

// Parse the stored metadata JSON for display in the Logs UI
export function parseMetadata(raw) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return { raw } }
}
