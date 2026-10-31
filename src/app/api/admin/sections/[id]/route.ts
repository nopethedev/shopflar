import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sanitizeSectionConfig } from '@/lib/sanitize'

// PATCH — update a section's draft config (autosave)
export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const existing = await db.pageSection.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

    const data = {}

    // Update draft config (autosave target)
    if (body.config !== undefined) {
      const cleanConfig = sanitizeSectionConfig(body.config)
      data.draftConfig = JSON.stringify(cleanConfig)
    }

    if (body.isVisible !== undefined) data.isVisible = !!body.isVisible
    if (body.sortOrder !== undefined) data.draftSortOrder = parseInt(body.sortOrder) || 0

    // Mark as deleted (draft)
    if (body.isDeleted !== undefined) data.isDeleted = !!body.isDeleted

    // Duplicate section
    if (body.duplicate === true) {
      const newSection = await db.pageSection.create({
        data: {
          pageType: existing.pageType,
          pageId: existing.pageId,
          sectionType: existing.sectionType,
          config: existing.config,
          draftConfig: existing.draftConfig || existing.config,
          sortOrder: existing.sortOrder + 1,
          isVisible: existing.isVisible,
          isDraft: true
        }
      })
      return NextResponse.json({
        section: { ...newSection, config: JSON.parse(newSection.draftConfig || newSection.config) }
      })
    }

    const updated = await db.pageSection.update({ where: { id }, data })
    return NextResponse.json({
      section: { ...updated, config: JSON.parse(updated.draftConfig || updated.config) }
    })
  } catch (e) {
    console.error('PATCH section error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE — mark for deletion (draft) or permanently delete if already draft-only
export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.pageSection.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

    // If it's a draft-only section (never published), delete permanently
    if (existing.isDraft) {
      await db.pageSection.delete({ where: { id } })
    } else {
      // Mark as deleted in draft — will be permanently removed on publish
      await db.pageSection.update({ where: { id }, data: { isDeleted: true } })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Delete section error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
