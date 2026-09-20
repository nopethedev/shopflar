import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { ProductsGrid } from '@/components/storefront/products-grid'
import { Breadcrumbs } from '@/components/storefront/breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({ searchParams }) {
  const sp = await searchParams
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' }
  })

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-6 md:py-8">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop All' }]} />
        <div className="mt-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {sp.search ? `Results for "${sp.search}"` : 'All Products'}
          </h1>
          <p className="text-muted-foreground mt-1">Browse our full catalog</p>
        </div>
        <ProductsGrid searchParams={sp} categories={categories} />
      </div>
    </StorefrontLayout>
  )
}
