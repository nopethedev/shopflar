import { db } from '@/lib/db'
import { PageBuilder } from '@/components/admin/page-builder'
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

  const initialDirty = sections.some(s => !!s.draftConfig || s.isDraft || s.isDeleted)
  const pageLabel = pageType === 'home'
    ? 'Home page'
    : currentPage?.title || 'Custom page'
  const publicPath = pageType === 'custom' && currentPage
    ? `/pages/${currentPage.slug}`
    : '/'

  return (
    <PageBuilder
      initialSections={parsedSections}
      initialDirty={initialDirty}
      categories={categories}
      pages={customPages}
      pageType={pageType}
      pageId={pageId}
      themeName={themeName}
      pageLabel={pageLabel}
      publicPath={publicPath}
    />
  )
}
