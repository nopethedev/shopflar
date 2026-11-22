import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { applySectionAction } from '@/lib/page-sections'
import { revalidatePath } from 'next/cache'

// POST /api/admin/sections/publish — promote or throw away a page's staged edits
export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const pageType = body.pageType === 'custom' ? 'custom' : 'home'
    const pageId = body.pageId || null
    const action = body.action || 'publish' // 'publish' | 'discard'
    if (action !== 'publish' && action !== 'discard') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
    const count = await applySectionAction(pageType, pageId, action)
    if (action === 'publish') {
      revalidatePath('/')
      revalidatePath('/pages/[slug]', 'page')
    }
    return NextResponse.json({ ok: true, action: action === 'publish' ? 'published' : 'discarded', count })
  } catch (e) {
    console.error('Publish/discard error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
