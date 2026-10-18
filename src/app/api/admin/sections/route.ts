import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sanitizeSectionConfig } from '@/lib/sanitize'

// GET /api/admin/sections?pageType=home&pageId=xxx&includeDraft=true
export async function GET(req) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const pageType = searchParams.get('pageType') || 'home'
    const pageId = searchParams.get('pageId') || null
    const includeDraft = searchParams.get('includeDraft') !== 'false'

    const where = { pageType, ...(pageId ? { pageId } : {}) }
    let sections = await db.pageSection.findMany({ where, orderBy: { sortOrder: 'asc' } })

    // If includeDraft, merge draft config into the response for the editor
    // The storefront only gets published config (includeDraft=false)
    if (includeDraft) {
      sections = sections.map(s => {
        if (s.draftConfig) {
          return { ...s, config: s.draftConfig } // editor sees draft version
        }
        return s
      })
    } else {
      // Storefront: exclude draft-only sections and deleted sections
      sections = sections.filter(s => !s.isDraft && !s.isDeleted)
    }

    // Parse configs for the response
    const parsed = sections.map(s => ({
      ...s,
      config: (() => { try { return JSON.parse(s.config) } catch { return {} } })()
    }))

    return NextResponse.json({ sections: parsed })
  } catch (e) {
    console.error('GET sections error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST — create a new section (in draft mode)
export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()

    // Sanitize the config
    const cleanConfig = sanitizeSectionConfig(body.config || {})

    const section = await db.pageSection.create({
      data: {
        pageType: body.pageType || 'home',
        pageId: body.pageId || null,
        sectionType: body.sectionType,
        config: JSON.stringify(cleanConfig), // published config (empty for draft-only)
        draftConfig: JSON.stringify(cleanConfig), // draft config = what editor sees
        sortOrder: body.sortOrder || 0,
        isVisible: body.isVisible !== false,
        isDraft: true // new sections start as draft
      }
    })
    return NextResponse.json({
      section: { ...section, config: JSON.parse(section.draftConfig || section.config) }
    })
  } catch (e) {
    console.error('Create section error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
