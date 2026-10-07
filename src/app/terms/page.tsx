import { db } from '@/lib/db'
import { getStoreSettings, getBusinessDetails, getLegalContent } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const [settings, categories, business, customContent] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({ where: { isVisible: true } }),
    getBusinessDetails(),
    getLegalContent('terms_and_conditions')
  ])

  const showCustom = customContent && customContent.length > 0
  const storeName = business.businessName || settings.storeName

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {showCustom ? (
          <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: customContent }} />
        ) : (
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="text-foreground">By using {storeName}, you agree to these terms. Please read them carefully.</p>

            <h2 className="text-foreground">1. Acceptance of terms</h2>
            <p>By accessing or using our website, you agree to be bound by these Terms &amp; Conditions and our <a href="/privacy" className="text-foreground hover:underline">Privacy Policy</a>. If you do not agree, please do not use our services.</p>

            <h2 className="text-foreground">2. Orders</h2>
            <ul>
              <li>All orders are subject to availability and confirmation of the order price.</li>
              <li>We reserve the right to refuse or cancel any order at our discretion.</li>
              <li>Prices are listed in your selected currency and may change without notice.</li>
              <li>Payment must be received in full before we ship your order.</li>
              <li>Server-side prices are authoritative — any pricing errors on the storefront will be corrected and you&apos;ll be notified.</li>
            </ul>

            <h2 className="text-foreground">3. Accounts</h2>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You must be 16 or older to create an account.</li>
              <li>You agree to provide accurate information when creating an account.</li>
            </ul>

            <h2 className="text-foreground">4. Shipping</h2>
            <p>See our <a href="/shipping" className="text-foreground hover:underline">Shipping Policy</a> for details on processing times, shipping methods, and delivery estimates.</p>

            <h2 className="text-foreground">5. Returns &amp; refunds</h2>
            <p>See our <a href="/returns" className="text-foreground hover:underline">Refund &amp; Returns Policy</a> for our return window, eligible items, and refund timing.</p>

            <h2 className="text-foreground">6. Intellectual property</h2>
            <p>All content on this site, including images, text, designs, logos, and code, is owned by {storeName} or its licensors and may not be reproduced without permission.</p>

            <h2 className="text-foreground">7. Product information</h2>
            <p>We make every effort to display product colors and details accurately. However, we cannot guarantee that your device&apos;s display will match the actual product. Product images are for illustration purposes and may differ slightly from the actual item.</p>

            <h2 className="text-foreground">8. Limitation of liability</h2>
            <p>{storeName} is not liable for damages beyond the value of the products purchased. We are not responsible for indirect, incidental, or consequential damages arising from the use of our products or services.</p>

            <h2 className="text-foreground">9. Governing law</h2>
            <p>These terms are governed by the laws of {business.country || 'your jurisdiction'}. Any disputes will be resolved in the courts of {business.country || 'your jurisdiction'}.</p>

            <h2 className="text-foreground">10. Changes to terms</h2>
            <p>We may update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.</p>

            <div className="mt-8 p-4 rounded-md bg-muted/30 border border-border">
              <h3 className="text-foreground font-semibold mb-2">Contact</h3>
              <p className="text-sm">
                {storeName}{business.legalName && business.legalName !== storeName ? ` (${business.legalName})` : ''}<br />
                {business.addressLine1 && <>{business.addressLine1}<br /></>}
                {(business.city || business.state || business.postalCode) && <>{business.city}{business.city && business.state ? ', ' : ''}{business.state} {business.postalCode}<br /></>}
                {business.country && <>{business.country}<br /></>}
                Email: <a href={`mailto:${business.email || settings.storeEmail}`} className="text-foreground hover:underline">{business.email || settings.storeEmail}</a>
                {business.registrationNumber && <><br />Reg. No: {business.registrationNumber}</>}
                {business.vatNumber && <><br />VAT/Tax ID: {business.vatNumber}</>}
              </p>
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
