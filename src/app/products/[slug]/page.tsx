import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { ProductDetail } from '@/components/storefront/product-detail'
import { Breadcrumbs } from '@/components/storefront/breadcrumbs'
import { ProductCard } from '@/components/storefront/product-card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug }, include: { categories: { include: { category: true } } } })
  if (!product) return { title: 'Product Not Found' }
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || '',
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.shortDescription || '',
      images: [{ url: product.images?.[0]?.url || '' }]
    }
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
      categories: { include: { category: true } },
      tags: true,
      reviews: { where: { isApproved: true }, take: 6, orderBy: { createdAt: 'desc' } }
    }
  })

  if (!product || product.status === 'DRAFT') {
    notFound()
  }

  // Related products
  const catIds = product.categories.map(c => c.categoryId)
  const related = await db.product.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: product.id },
      OR: [
        { categories: { some: { categoryId: { in: catIds } } } },
        { tags: { some: { tag: { in: product.tags.map(t => t.tag) } } } }
      ]
    },
    include: { images: true, categories: { include: { category: true } }, variants: true },
    take: 4
  })

  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/products' }
  ]
  if (product.categories[0]) {
    crumbs.push({
      label: product.categories[0].category.name,
      href: `/categories/${product.categories[0].category.slug}`
    })
  }
  crumbs.push({ label: product.name })

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-6 md:py-8">
        <Breadcrumbs items={crumbs} />
        <div className="mt-6">
          <ProductDetail product={product} settings={settings} />
        </div>

        {related.length > 0 && (
          <div className="mt-16 md:mt-24">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              You may also like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
