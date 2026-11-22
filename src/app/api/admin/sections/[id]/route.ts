import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sanitizeSectionConfig } from '@/lib/sanitize'
import { withDraft } from '@/lib/page-sections'

// PATCH — stage a change on a section (autosave target). Nothing here touches
// the published state; that only happens in /sections/publish.
export async function PATCH(req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const existing = await db.pageSection.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

    // Duplicate: copy the *staged* state, so unsaved-then-autosaved edits come along
    if (body.duplicate === true) {
      const staged = existing.draftConfig ?? existing.config
      const copy = await db.pageSection.create({
        data: {
          pageType: existing.pageType,
          pageId: existing.pageId,
          sectionType: existing.sectionType,
          config: staged,
          draftConfig: staged,
          sortOrder: (existing.draftSortOrder ?? existing.sortOrder) + 1,
          isVisible: existing.draftIsVisible ?? existing.isVisible,
          isDraft: true
        }
      })
      return NextResponse.json({ section: withDraft(copy) })
    }

    const data: Record<string, any> = {}
    if (body.config !== undefined) data.draftConfig = JSON.stringify(sanitizeSectionConfig(body.config))
    if (body.isVisible !== undefined) data.draftIsVisible = !!body.isVisible
    if (body.sortOrder !== undefined) data.draftSortOrder = Math.trunc(+body.sortOrder) || 0
    if (body.isDeleted !== undefined) data.isDeleted = !!body.isDeleted

    const updated = await db.pageSection.update({ where: { id }, data })
    return NextResponse.json({ section: withDraft(updated) })
  } catch (e) {
    console.error('PATCH section error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE — always a soft delete while editing, so Undo can bring the section
// back. Publish removes the row for good; Discard restores/cleans up.
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const existing = await db.pageSection.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    await db.pageSection.update({ where: { id }, data: { isDeleted: true } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Delete section error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
