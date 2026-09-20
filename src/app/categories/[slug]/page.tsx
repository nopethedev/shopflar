import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { ProductsGrid } from '@/components/storefront/products-grid'
import { Breadcrumbs } from '@/components/storefront/breadcrumbs'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const cat = await db.category.findUnique({ where: { slug } })
  if (!cat) return { title: 'Category Not Found' }
  return { title: cat.name, description: cat.description || '' }
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params
  const sp = await searchParams
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  const category = await db.category.findUnique({
    where: { slug },
    include: { children: true, parent: true }
  })
  if (!category || !category.isVisible) notFound()

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/products' }
  ]
  if (category.parent) {
    crumbs.push({ label: category.parent.name, href: `/categories/${category.parent.slug}` })
  }
  crumbs.push({ label: category.name })

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-6 md:py-8">
        <Breadcrumbs items={crumbs} />
        <div className="mt-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {category.name}
          </h1>
          {category.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">{category.description}</p>
          )}
        </div>

        {category.children && category.children.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {category.children.map(c => (
              <a
                key={c.id}
                href={`/categories/${c.slug}`}
                className="px-4 py-2 text-sm rounded-md border border-border hover:border-foreground/50 transition-colors"
              >
                {c.name}
              </a>
            ))}
          </div>
        )}

        <ProductsGrid searchParams={{ ...sp, category: category.id }} categories={categories} />
      </div>
    </StorefrontLayout>
  )
}
