// Shared helpers for the page builder's draft/publish model.
//
// Every PageSection row carries a published state (config, sortOrder,
// isVisible) and an optional staged "draft" state (draftConfig,
// draftSortOrder, draftIsVisible). The editor and the admin-only preview
// read the draft state; the public storefront only ever reads the published
// state of rows that have been published at least once.
import { db } from '@/lib/db'

export function parseConfig(raw: unknown): Record<string, any> {
  if (raw && typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw !== 'string' || !raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Row as the editor / draft preview sees it: draft values win. */
export function withDraft<T extends Record<string, any>>(row: T) {
  return {
    ...row,
    config: parseConfig(row.draftConfig ?? row.config),
    isVisible: row.draftIsVisible ?? row.isVisible,
    sortOrder: row.draftSortOrder ?? row.sortOrder
  }
}

/** Row as the public storefront sees it. */
export function published<T extends Record<string, any>>(row: T) {
  return { ...row, config: parseConfig(row.config) }
}

export function pageWhere(pageType: string, pageId?: string | null) {
  return { pageType, pageId: pageType === 'home' ? null : pageId || null }
}

/**
 * Sections to render on a storefront page.
 * `preview` (admins only) merges staged edits and includes draft-only sections.
 */
export async function getRenderableSections(pageType: string, pageId: string | null, preview: boolean) {
  if (preview) {
    const rows = await db.pageSection.findMany({ where: { ...pageWhere(pageType, pageId), isDeleted: false } })
    return rows.map(withDraft).sort((a, b) => a.sortOrder - b.sortOrder)
  }
  const rows = await db.pageSection.findMany({
    where: { ...pageWhere(pageType, pageId), isDraft: false, isDeleted: false },
    orderBy: { sortOrder: 'asc' }
  })
  return rows.map(published)
}

/** Sections as the editor loads them (soft-deleted rows excluded). */
export async function getEditorSections(pageType: string, pageId: string | null) {
  const rows = await db.pageSection.findMany({ where: { ...pageWhere(pageType, pageId), isDeleted: false } })
  return rows.map(withDraft).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function hasUnpublishedChanges(rows: Array<Record<string, any>>) {
  return rows.some(r =>
    r.isDeleted || r.isDraft || r.draftConfig != null || r.draftSortOrder != null || r.draftIsVisible != null
  )
}

/** Promote (publish) or throw away (discard) a page's staged edits, atomically. */
export async function applySectionAction(pageType: string, pageId: string | null, action: 'publish' | 'discard') {
  const sections = await db.pageSection.findMany({ where: pageWhere(pageType, pageId) })
  const ops = sections.map(s => {
    if (action === 'publish') {
      if (s.isDeleted) return db.pageSection.delete({ where: { id: s.id } })
      return db.pageSection.update({
        where: { id: s.id },
        data: {
          config: s.draftConfig ?? s.config,
          sortOrder: s.draftSortOrder ?? s.sortOrder,
          isVisible: s.draftIsVisible ?? s.isVisible,
          draftConfig: null,
          draftSortOrder: null,
          draftIsVisible: null,
          isDraft: false,
          isDeleted: false
        }
      })
    }
    if (s.isDraft) return db.pageSection.delete({ where: { id: s.id } })
    return db.pageSection.update({
      where: { id: s.id },
      data: { draftConfig: null, draftSortOrder: null, draftIsVisible: null, isDeleted: false }
    })
  })
  await db.$transaction(ops)
  return sections.length
}
