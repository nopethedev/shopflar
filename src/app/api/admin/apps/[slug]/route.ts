import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { APP_BY_SLUG } from '@/lib/app-catalog'
import { isAppReady, publicConfig, saveApp } from '@/lib/apps'
import { logEvent } from '@/lib/logs'

export async function PATCH(req, { params }) {
  try {
    const admin = await requireAdmin()
    const { slug } = await params
    const def = APP_BY_SLUG[slug]
    if (!def) return NextResponse.json({ error: 'Unknown app' }, { status: 404 })
    const body = await req.json()
    const state = await saveApp(slug, { enabled: body.enabled, config: body.config })
    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email, entity: 'app',
      metadata: { app: slug, enabled: state.enabled }, notify: false
    }).catch(() => {})
    return NextResponse.json({
      app: { slug, enabled: state.enabled, ready: isAppReady(def, state), config: publicConfig(def, state.config) }
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
