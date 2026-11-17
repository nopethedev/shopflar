import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isDemoMode, getDemoStatus, resetDemo } from '@/lib/demo'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(await getDemoStatus(), {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'UNAUTHORIZED' ? 401 : 403 })
  }
}

export async function POST(req) {
  try {
    await requireAdmin()
    if (!isDemoMode()) {
      return NextResponse.json(
        { error: 'Demo mode is disabled. Set DEMO_MODE="true" to enable it.' },
        { status: 400 }
      )
    }
    const body = await req.json().catch(() => ({}))
    if (body?.action !== 'reset') {
      return NextResponse.json({ error: 'Unknown demo action.' }, { status: 400 })
    }
    await resetDemo('manual')
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Demo reset failed.' }, { status: 500 })
  }
}
