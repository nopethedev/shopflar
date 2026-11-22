// Server-side app state: enabled flag + saved settings per app.
// Settings live in the existing `plugins` table (config = JSON), so no
// migration is needed. Secret fields are never sent back to the browser.
import { db } from '@/lib/db'
import { APP_BY_SLUG, APP_CATALOG, type AppDef } from '@/lib/app-catalog'

export type AppState = { slug: string; enabled: boolean; config: Record<string, any> }

function parse(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {}
  try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : {} } catch { return {} }
}

let cache: { ts: number; rows: Map<string, AppState> } | null = null
const TTL = 15_000

export function invalidateAppCache() { cache = null }

async function load(): Promise<Map<string, AppState>> {
  if (cache && Date.now() - cache.ts < TTL) return cache.rows
  const rows = new Map<string, AppState>()
  try {
    const list = await db.plugin.findMany()
    for (const r of list) rows.set(r.slug, { slug: r.slug, enabled: r.enabled, config: parse(r.config) })
  } catch { /* table missing during first boot */ }
  cache = { ts: Date.now(), rows }
  return rows
}

export async function getAppState(slug: string): Promise<AppState> {
  return (await load()).get(slug) || { slug, enabled: false, config: {} }
}

export async function getAllAppStates() {
  return load()
}

/** True when the app is enabled and every required field is filled in. */
export function isAppReady(def: AppDef | undefined, state: AppState) {
  if (!def || !state.enabled) return false
  return (def.fields || []).filter(f => f.required).every(f => String(state.config[f.key] ?? '').trim() !== '')
}

export async function getReadyApp(slug: string) {
  const state = await getAppState(slug)
  return isAppReady(APP_BY_SLUG[slug], state) ? state : null
}

const MASK = '••••••••'

/** Config safe to send to the browser: secrets replaced with a mask + hint. */
export function publicConfig(def: AppDef, config: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const f of def.fields || []) {
    const v = config[f.key]
    if (f.type === 'secret') {
      out[f.key] = v ? `${MASK}${String(v).slice(-4)}` : ''
    } else {
      out[f.key] = v ?? (f.type === 'toggle' ? false : '')
    }
  }
  return out
}

export async function saveApp(slug: string, patch: { enabled?: boolean; config?: Record<string, any> }) {
  const def = APP_BY_SLUG[slug]
  if (!def) throw new Error('Unknown app')
  const current = await getAppState(slug)
  const next = { ...current.config }
  if (patch.config) {
    for (const f of def.fields || []) {
      if (!(f.key in patch.config)) continue
      let v = patch.config[f.key]
      if (f.type === 'toggle') v = !!v
      else v = String(v ?? '').slice(0, f.type === 'textarea' ? 8000 : 500)
      // Keep the stored secret when the browser echoes the mask back or sends blank
      if (f.type === 'secret' && (v === '' || String(v).startsWith(MASK))) continue
      next[f.key] = typeof v === 'string' && f.type !== 'textarea' ? v.trim() : v
    }
  }
  const row = await db.plugin.upsert({
    where: { slug },
    update: { ...(patch.enabled !== undefined ? { enabled: !!patch.enabled } : {}), config: JSON.stringify(next) },
    create: { slug, name: def.name, description: def.description, enabled: !!patch.enabled, config: JSON.stringify(next) }
  })
  invalidateAppCache()
  return { slug, enabled: row.enabled, config: next } as AppState
}

export { APP_CATALOG }
