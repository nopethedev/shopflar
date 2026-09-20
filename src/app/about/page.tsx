import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          About {settings.storeName}
        </h1>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p className="text-foreground text-lg leading-relaxed">
            {settings.storeName} was founded on a simple idea: clothing should be made to last, designed with intention, and priced honestly. We work directly with mills and makers around the world to bring you considered essentials that hold up to real life.
          </p>
          <p className="mt-4 leading-relaxed">
            Every piece in our catalog is chosen for quality, fit, and longevity — not trends that fade in a season. From heavyweight hoodies that survive years of washes to merino sweaters that get better with age, we obsess over the details so you don&apos;t have to.
          </p>
          <h2 className="text-2xl font-bold mt-8 mb-3 text-foreground">Our Promise</h2>
          <ul className="space-y-2 mt-3">
            <li>Materials sourced from certified mills with fair labor practices</li>
            <li>30-day hassle-free returns on all unworn items</li>
            <li>Transparent pricing — no fake markdowns, no inflated MSRPs</li>
            <li>Carbon-neutral shipping on every order</li>
          </ul>
        </div>
      </div>
    </StorefrontLayout>
  )
}
