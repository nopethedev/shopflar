import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/sections/publish — publish all draft changes for a page
export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const pageType = body.pageType || 'home'
    const pageId = body.pageId || null
    const action = body.action || 'publish' // 'publish' | 'discard'

    const where = { pageType, ...(pageId ? { pageId } : {}) }
    const sections = await db.pageSection.findMany({ where })

    if (action === 'publish') {
      // Apply: copy draftConfig to config, clear draft flags, delete marked sections
      for (const s of sections) {
        if (s.isDeleted) {
          await db.pageSection.delete({ where: { id: s.id } })
          continue
        }
        await db.pageSection.update({
          where: { id: s.id },
          data: {
            config: s.draftConfig || s.config,
            draftConfig: null,
            sortOrder: s.draftSortOrder !== null ? s.draftSortOrder : s.sortOrder,
            draftSortOrder: null,
            isDraft: false,
            isDeleted: false
          }
        })
      }
      return NextResponse.json({ ok: true, action: 'published', count: sections.length })
    } else if (action === 'discard') {
      // Discard: revert draft config to published, delete draft-only sections
      for (const s of sections) {
        if (s.isDraft) {
          // Section was newly added in draft — delete it
          await db.pageSection.delete({ where: { id: s.id } })
          continue
        }
        await db.pageSection.update({
          where: { id: s.id },
          data: {
            draftConfig: null,
            draftSortOrder: null,
            isDeleted: false
          }
        })
      }
      return NextResponse.json({ ok: true, action: 'discarded', count: sections.length })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('Publish/discard error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
