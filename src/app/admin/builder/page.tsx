import { db } from '@/lib/db'
import { PageBuilder } from '@/components/admin/page-builder'
import { PageSelector } from '@/components/admin/page-selector'
import { getTheme } from '@/lib/themes'

export const dynamic = 'force-dynamic'

export default async function AdminBuilderPage({ searchParams }) {
  const sp = await searchParams
  const pageType = sp.pageType || 'home'
  const pageId = sp.pageId || null

  const [sections, categories, customPages, activeThemeRow] = await Promise.all([
    db.pageSection.findMany({
      where: { pageType, ...(pageId ? { pageId } : {}) },
      orderBy: { sortOrder: 'asc' }
    }),
    db.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
    db.customPage.findMany({ select: { id: true, title: true, slug: true, status: true }, orderBy: { title: 'asc' } }),
    db.storeSetting.findUnique({ where: { key: 'active_theme' } })
  ])
  const themeName = getTheme(activeThemeRow?.value || 'dawn')?.name || 'Dawn'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Online Store · Themes</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Theme editor</h1>
          <p className="sf-sub mt-0.5">
            {pageType === 'home' && 'Editing the home page template'}
            {pageType === 'custom' && currentPage && `Editing “${currentPage.title}”`}
            {pageType === 'custom' && !currentPage && 'Editing a custom page template'}
            {' · '}Theme: <span className="font-medium text-[#303030]">{themeName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#616161]">Page</span>
          <PageSelector pages={customPages} currentPageType={pageType} currentPageId={pageId} />
          <a href="/admin/themes" className="sf-btn sf-btn-secondary">Theme library</a>
        </div>
      </div>
      <PageBuilder
        initialSections={parsedSections}
        categories={categories}
        pageType={pageType}
        pageId={pageId}
        themeName={themeName}
      />
    </div>
  )
}
