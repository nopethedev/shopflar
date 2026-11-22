import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { APP_CATALOG } from '@/lib/app-catalog'
import { getAllAppStates, isAppReady, publicConfig } from '@/lib/apps'

export async function GET() {
  try {
    await requireAdmin()
    const states = await getAllAppStates()
    return NextResponse.json({
      apps: APP_CATALOG.map(def => {
        const s = states.get(def.slug) || { slug: def.slug, enabled: false, config: {} }
        return { ...def, enabled: s.enabled, ready: isAppReady(def, s), config: publicConfig(def, s.config) }
      })
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
