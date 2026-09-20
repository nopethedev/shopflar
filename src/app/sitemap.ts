import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shopflar.example.com'

  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isVisible: true }, select: { slug: true, updatedAt: true } })
  ])

  const staticPages = [
    { url: '', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: '/products', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: '/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: '/contact', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: '/shipping', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: '/returns', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: '/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: '/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 }
  ]

  return [
    ...staticPages.map(p => ({
      url: `${baseUrl}${p.url}`,
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority
    })),
    ...products.map(p => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8
    })),
    ...categories.map(c => ({
      url: `${baseUrl}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7
    }))
  ]
}
