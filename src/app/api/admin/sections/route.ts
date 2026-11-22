import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sanitizeSectionConfig } from '@/lib/sanitize'
import { getEditorSections, getRenderableSections, withDraft } from '@/lib/page-sections'

// GET /api/admin/sections?pageType=home&pageId=xxx&includeDraft=true
export async function GET(req) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const pageType = searchParams.get('pageType') || 'home'
    const pageId = searchParams.get('pageId') || null
    const includeDraft = searchParams.get('includeDraft') !== 'false'
    const sections = includeDraft
      ? await getEditorSections(pageType, pageId)
      : await getRenderableSections(pageType, pageId, false)
    return NextResponse.json({ sections })
  } catch (e) {
    console.error('GET sections error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST — create a new section. It starts as a draft: invisible to the public
// storefront until the page is published.
export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    if (!body.sectionType || typeof body.sectionType !== 'string') {
      return NextResponse.json({ error: 'sectionType is required' }, { status: 400 })
    }
    const pageType = body.pageType || 'home'
    const cleanConfig = JSON.stringify(sanitizeSectionConfig(body.config || {}))
    const section = await db.pageSection.create({
      data: {
        pageType,
        pageId: pageType === 'home' ? null : body.pageId || null,
        sectionType: body.sectionType,
        config: cleanConfig,
        draftConfig: cleanConfig,
        sortOrder: Number.isFinite(+body.sortOrder) ? Math.trunc(+body.sortOrder) : 0,
        isVisible: body.isVisible !== false,
        isDraft: true
      }
    })
    return NextResponse.json({ section: withDraft(section) })
  } catch (e) {
    console.error('Create section error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
