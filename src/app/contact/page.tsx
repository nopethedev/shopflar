import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { ContactForm } from '@/components/storefront/contact-form'

export const dynamic = 'force-dynamic'

export default async function ContactPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Get in Touch
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Questions about an order, a product, or anything else? We typically respond within one business day.
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="font-semibold mb-2">Contact details</h2>
            <p className="text-sm text-muted-foreground">{settings.storeEmail}</p>
            <p className="text-sm text-muted-foreground">{settings.storePhone}</p>
            <p className="text-sm text-muted-foreground mt-4">{settings.storeAddress}</p>
          </div>
          <ContactForm email={settings.storeEmail} />
        </div>
      </div>
    </StorefrontLayout>
  )
}
