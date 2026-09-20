import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function ReturnsPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Returns &amp; Exchanges</h1>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <h2 className="text-foreground">30-day return window</h2>
          <p>We accept returns within 30 days of delivery for items that are unworn, unwashed, and in their original condition with tags attached. Refunds are issued to the original payment method.</p>
          <h2 className="text-foreground">How to start a return</h2>
          <ol>
            <li>Email us at {settings.storeEmail} with your order number</li>
            <li>We&apos;ll send you a prepaid return label (US orders)</li>
            <li>Drop off the package at any USPS location</li>
            <li>Refunds are processed within 5 business days of receipt</li>
          </ol>
          <h2 className="text-foreground">Exchanges</h2>
          <p>For a different size or color, place a new order for the item you want and return the original for a refund. This is faster than waiting for stock to be allocated.</p>
        </div>
      </div>
    </StorefrontLayout>
  )
}
