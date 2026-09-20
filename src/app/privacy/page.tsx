import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Privacy Policy</h1>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p className="text-foreground">{settings.storeName} respects your privacy. This policy explains what data we collect and how we use it.</p>
          <h2 className="text-foreground">Information we collect</h2>
          <ul>
            <li>Contact information (name, email, shipping address) when you place an order</li>
            <li>Account credentials if you create an account</li>
            <li>Browsing data via cookies for analytics and cart persistence</li>
          </ul>
          <h2 className="text-foreground">How we use your data</h2>
          <p>We use your information to fulfill orders, communicate about your purchases, and improve our store. We never sell your data to third parties.</p>
          <h2 className="text-foreground">Payment security</h2>
          <p>Payments are processed by Stripe and PayPal. We never store your full card details on our servers — only the last 4 digits and a payment reference for your records.</p>
          <h2 className="text-foreground">Your rights</h2>
          <p>You can request access, correction, or deletion of your data at any time by emailing {settings.storeEmail}.</p>
        </div>
      </div>
    </StorefrontLayout>
  )
}
