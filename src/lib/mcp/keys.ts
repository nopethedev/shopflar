// API keys for the MCP server. Keys look like `sfk_<48 hex>`; only a SHA-256
// hash is stored, so a database leak does not leak working keys.
import crypto from 'node:crypto'
import { db } from '@/lib/db'

export type KeyScope = 'read' | 'write'
export type VerifiedKey = { id: string; name: string; scope: KeyScope }

const hash = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex')

export async function createApiKey(name: string, scope: KeyScope) {
  const raw = `sfk_${crypto.randomBytes(24).toString('hex')}`
  const row = await db.apiKey.create({
    data: { name: name.slice(0, 80) || 'Untitled key', scope: scope === 'write' ? 'write' : 'read', keyHash: hash(raw), prefix: raw.slice(0, 8) }
  })
  return { key: raw, id: row.id }
}

export async function listApiKeys() {
  const rows = await db.apiKey.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(r => ({
    id: r.id, name: r.name, prefix: r.prefix, scope: r.scope,
    lastUsedAt: r.lastUsedAt?.toISOString() || null, revokedAt: r.revokedAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString()
  }))
}

export async function revokeApiKey(id: string) {
  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
}

// Tiny fixed-window limiter (per key, per process) — keeps a runaway agent
// loop from hammering the database.
const hits = new Map<string, { n: number; reset: number }>()
export function rateLimited(keyId: string, limit = 120, windowMs = 60_000) {
  const now = Date.now()
  const h = hits.get(keyId)
  if (!h || now > h.reset) { hits.set(keyId, { n: 1, reset: now + windowMs }); return false }
  h.n++
  return h.n > limit
}

export async function verifyBearer(header: string | null): Promise<VerifiedKey | null> {
  const m = /^Bearer\s+(sfk_[a-f0-9]{48})$/i.exec(header || '')
  if (!m) return null
  const row = await db.apiKey.findUnique({ where: { keyHash: hash(m[1]) } })
  if (!row || row.revokedAt) return null
  // Update lastUsedAt at most once a minute
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
  }
  return { id: row.id, name: row.name, scope: row.scope === 'write' ? 'write' : 'read' }
}
