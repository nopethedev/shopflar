import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sanitizeSectionConfig } from '@/lib/sanitize'
import { getEditorSections } from '@/lib/page-sections'

// PUT /api/admin/sections/state
// Stage the editor's whole state in one transaction: order, visibility,
// soft-deletion and (optionally) configs. Used for reorders, undo/redo and the
// final flush before publishing — one request instead of N racing PATCHes.
//
// body: { pageType, pageId, items: [{ id, config?, isVisible?, isDeleted? }] }
// The position in `items` becomes the section's staged sort order.
export async function PUT(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const items = Array.isArray(body.items) ? body.items : []
    if (items.length > 500) return NextResponse.json({ error: 'Too many sections' }, { status: 400 })

    await db.$transaction(
      items.map((item, index) => {
        const data: Record<string, any> = { draftSortOrder: index }
        if (item.config !== undefined) data.draftConfig = JSON.stringify(sanitizeSectionConfig(item.config))
        if (item.isVisible !== undefined) data.draftIsVisible = !!item.isVisible
        if (item.isDeleted !== undefined) data.isDeleted = !!item.isDeleted
        return db.pageSection.updateMany({ where: { id: String(item.id) }, data })
      })
    )
    const sections = body.returnSections
      ? await getEditorSections(body.pageType || 'home', body.pageId || null)
      : undefined
    return NextResponse.json({ ok: true, sections })
  } catch (e) {
    console.error('Section state error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
