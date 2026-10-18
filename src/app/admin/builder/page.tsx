import { db } from '@/lib/db'
import { PageBuilder } from '@/components/admin/page-builder'
import { PageSelector } from '@/components/admin/page-selector'

export const dynamic = 'force-dynamic'

export default async function AdminBuilderPage({ searchParams }) {
  const sp = await searchParams
  const pageType = sp.pageType || 'home'
  const pageId = sp.pageId || null

  const [sections, categories, customPages] = await Promise.all([
    db.pageSection.findMany({
      where: { pageType, ...(pageId ? { pageId } : {}) },
      orderBy: { sortOrder: 'asc' }
    }),
    db.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
    db.customPage.findMany({ select: { id: true, title: true, slug: true, status: true }, orderBy: { title: 'asc' } })
  ])

  // Parse section configs — prefer draftConfig if it exists (editor shows draft)
  const parsedSections = sections.map(s => ({
    ...s,
    config: (() => {
      try {
        return JSON.parse(s.draftConfig || s.config)
      } catch {
        return {}
      }
    })()
  }))

  const currentPage = pageType === 'custom' && pageId
    ? customPages.find(p => p.id === pageId)
    : null

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Page Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pageType === 'home' && 'Editing: Home page'}
            {pageType === 'custom' && currentPage && `Editing: ${currentPage.title}`}
            {pageType === 'custom' && !currentPage && 'Editing: Custom page'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Page:</span>
          <PageSelector pages={customPages} currentPageType={pageType} currentPageId={pageId} />
        </div>
      </div>
      <PageBuilder initialSections={parsedSections} categories={categories} pageType={pageType} pageId={pageId} />
    </div>
  )
}
