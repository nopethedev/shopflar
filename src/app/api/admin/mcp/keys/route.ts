import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createApiKey, listApiKeys } from '@/lib/mcp/keys'
import { logEvent } from '@/lib/logs'

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json({ keys: await listApiKeys() })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// The raw key is returned exactly once, in this response.
export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    const scope = body.scope === 'write' ? 'write' : 'read'
    const { key, id } = await createApiKey(String(body.name || '').trim() || 'Claude', scope)
    await logEvent('settings.updated', { actorId: admin.id, actorEmail: admin.email, entity: 'api_key', entityId: id, metadata: { created: true, scope }, notify: false })
    return NextResponse.json({ key, id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
