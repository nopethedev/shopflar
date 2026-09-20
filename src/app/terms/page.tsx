import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Terms of Service</h1>
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p className="text-foreground">By using {settings.storeName}, you agree to these terms. Please read them carefully.</p>
          <h2 className="text-foreground">Orders</h2>
          <p>All orders are subject to availability. We reserve the right to refuse or cancel any order. Prices are listed in USD unless otherwise noted and may change without notice.</p>
          <h2 className="text-foreground">Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
          <h2 className="text-foreground">Intellectual property</h2>
          <p>All content on this site, including images, text, and code, is owned by {settings.storeName} and may not be reproduced without permission.</p>
          <h2 className="text-foreground">Liability</h2>
          <p>{settings.storeName} is not liable for damages beyond the value of the products purchased. We are not responsible for indirect, incidental, or consequential damages.</p>
          <h2 className="text-foreground">Contact</h2>
          <p>Questions? Email us at {settings.storeEmail}.</p>
        </div>
      </div>
    </StorefrontLayout>
  )
}
