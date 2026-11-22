import { db } from '@/lib/db'
import { PageBuilder } from '@/components/admin/page-builder'
import { getTheme } from '@/lib/themes'
import { pageWhere, withDraft, hasUnpublishedChanges } from '@/lib/page-sections'

export const dynamic = 'force-dynamic'

export default async function AdminBuilderPage({ searchParams }) {
  const sp = await searchParams
  const pageType = sp.pageType === 'custom' ? 'custom' : 'home'
  const pageId = pageType === 'custom' ? sp.pageId || null : null

  const [rows, categories, customPages, products, activeThemeRow] = await Promise.all([
    db.pageSection.findMany({ where: pageWhere(pageType, pageId) }),
    db.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, slug: true } }),
    db.customPage.findMany({ select: { id: true, title: true, slug: true, status: true }, orderBy: { title: 'asc' } }),
    db.product.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' }, take: 200 }),
    db.storeSetting.findUnique({ where: { key: 'active_theme' } })
  ])

  // Editor shows the staged state; soft-deleted rows stay hidden (they are
  // only waiting for the next publish to be removed for good).
  const sections = rows.filter(r => !r.isDeleted).map(withDraft).sort((a, b) => a.sortOrder - b.sortOrder)
  const themeName = getTheme(activeThemeRow?.value || 'dawn')?.name || 'Dawn'

  const currentPage = pageType === 'custom' && pageId ? customPages.find(p => p.id === pageId) : null
  const pageLabel = pageType === 'home' ? 'Home page' : currentPage?.title || 'Custom page'
  const publicPath = pageType === 'custom' && currentPage ? `/pages/${currentPage.slug}` : '/'

  return (
    <PageBuilder
      // A fresh editor per page — never carry state across page switches
      key={`${pageType}:${pageId || 'home'}`}
      initialSections={sections}
      initialDirty={hasUnpublishedChanges(rows)}
      categories={categories}
      products={products}
      pages={customPages}
      pageType={pageType}
      pageId={pageId}
      themeName={themeName}
      pageLabel={pageLabel}
      publicPath={publicPath}
    />
  )
}
