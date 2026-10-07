import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const page = await db.customPage.findUnique({ where: { slug } })
  if (!page || page.status !== 'PUBLISHED') return { title: 'Page Not Found' }
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.excerpt || '',
    openGraph: { title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt || '' }
  }
}

export default async function CustomPageView({ params }) {
  const { slug } = await params
  const [settings, categories, page] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({ where: { isVisible: true } }),
    db.customPage.findUnique({ where: { slug } })
  ])

  if (!page || page.status !== 'PUBLISHED') notFound()

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <article className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          {page.title}
        </h1>
        {page.excerpt && (
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{page.excerpt}</p>
        )}
        <div
          className="prose prose-lg max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-foreground"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
        {page.updatedAt && (
          <p className="text-xs text-muted-foreground mt-12 pt-6 border-t border-border">
            Last updated: {new Date(page.updatedAt).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </article>
    </StorefrontLayout>
  )
}
