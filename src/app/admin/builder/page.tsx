import { db } from '@/lib/db'
import { PageBuilder } from '@/components/admin/page-builder'

export const dynamic = 'force-dynamic'

export default async function AdminBuilderPage() {
  const [sections, categories] = await Promise.all([
    db.pageSection.findMany({
      where: { pageType: 'home' },
      orderBy: { sortOrder: 'asc' }
    }),
    db.category.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } })
  ])

  // Parse section configs
  const parsedSections = sections.map(s => ({
    ...s,
    config: (() => { try { return JSON.parse(s.config) } catch { return {} } })()
  }))

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Page Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your home page by adding, removing, and reordering sections. Changes apply immediately.
        </p>
      </div>
      <PageBuilder initialSections={parsedSections} categories={categories} />
    </div>
  )
}
