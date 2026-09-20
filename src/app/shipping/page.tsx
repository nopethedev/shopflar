import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function ShippingPolicyPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Shipping Policy</h1>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <h2 className="text-foreground">Processing time</h2>
          <p>Orders are processed within 1-2 business days (Monday–Friday, excluding holidays). You&apos;ll receive a tracking number by email once your order ships.</p>
          <h2 className="text-foreground">Shipping rates</h2>
          <ul>
            <li>Standard shipping (3-5 business days): Free on orders over $75, otherwise $8</li>
            <li>Express shipping (1-2 business days): $18.50</li>
            <li>International shipping (7-14 business days): $32</li>
          </ul>
          <h2 className="text-foreground">International orders</h2>
          <p>Customs duties and import taxes are the responsibility of the recipient. We are unable to mark packages as gifts or reduce declared values.</p>
        </div>
      </div>
    </StorefrontLayout>
  )
}
