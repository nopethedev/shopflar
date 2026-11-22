import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { revokeApiKey } from '@/lib/mcp/keys'
import { logEvent } from '@/lib/logs'

export async function DELETE(_req, { params }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    await revokeApiKey(id)
    await logEvent('settings.updated', { actorId: admin.id, actorEmail: admin.email, entity: 'api_key', entityId: id, metadata: { revoked: true }, notify: false })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
