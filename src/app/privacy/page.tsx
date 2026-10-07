import { db } from '@/lib/db'
import { getStoreSettings, getBusinessDetails, getLegalContent } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const [settings, categories, business, customContent] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({ where: { isVisible: true } }),
    getBusinessDetails(),
    getLegalContent('privacy_policy')
  ])

  const showCustom = customContent && customContent.length > 0
  const storeName = business.businessName || settings.storeName

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {showCustom ? (
          <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: customContent }} />
        ) : (
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="text-foreground">{storeName} respects your privacy. This policy explains what data we collect and how we use it.</p>

            <h2 className="text-foreground">Information we collect</h2>
            <ul>
              <li><strong>Contact information</strong> (name, email, shipping address) when you place an order</li>
              <li><strong>Account credentials</strong> (email + hashed password) if you create an account</li>
              <li><strong>Order history</strong> — what you bought and when</li>
              <li><strong>Browsing data</strong> via cookies for cart persistence (see our <a href="/cookies" className="text-foreground hover:underline">Cookie Policy</a>)</li>
              <li><strong>IP address</strong> — for security and fraud prevention</li>
            </ul>

            <h2 className="text-foreground">How we use your data</h2>
            <ul>
              <li>To fulfill orders and process payments</li>
              <li>To communicate about your purchases (order confirmations, shipping updates)</li>
              <li>To improve our store and product selection</li>
              <li>To prevent fraud and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p>We <strong>never sell your data</strong> to third parties.</p>

            <h2 className="text-foreground">Legal basis for processing</h2>
            <p>Under GDPR (EU/UK), we process your data based on:</p>
            <ul>
              <li><strong>Contract</strong> — to fulfill your orders</li>
              <li><strong>Consent</strong> — for marketing emails and non-essential cookies (you can withdraw at any time)</li>
              <li><strong>Legitimate interest</strong> — for fraud prevention and security</li>
              <li><strong>Legal obligation</strong> — for tax records and financial compliance</li>
            </ul>

            <h2 className="text-foreground">Payment security</h2>
            <p>
              Payments are processed by Stripe and PayPal. We never store your full card details on our servers — only the last 4 digits and a payment reference for your records. See their privacy policies:
            </p>
            <ul>
              <li><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Stripe Privacy Policy</a></li>
              <li><a href="https://www.paypal.com/us/webapps/mpp/ua/privacy-full" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">PayPal Privacy Policy</a></li>
            </ul>

            <h2 className="text-foreground">Data retention</h2>
            <ul>
              <li>Order data: 7 years (for tax and legal compliance)</li>
              <li>Account data: until you request deletion</li>
              <li>Newsletter: until you unsubscribe</li>
            </ul>

            <h2 className="text-foreground">Your rights</h2>
            <p>You can request access, correction, or deletion of your data at any time by emailing us. Depending on your location, you may also have rights to:</p>
            <ul>
              <li>Access a copy of your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Be forgotten (deleted from our systems)</li>
              <li>Restrict or object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <h2 className="text-foreground">Children&apos;s privacy</h2>
            <p>Our services are not directed to children under 16. We do not knowingly collect personal information from children.</p>

            <h2 className="text-foreground">International transfers</h2>
            <p>Your data may be processed in countries other than your own (including the United States). We take reasonable measures to ensure it&apos;s protected in accordance with this policy and applicable law.</p>

            <div className="mt-8 p-4 rounded-md bg-muted/30 border border-border">
              <h3 className="text-foreground font-semibold mb-2">Contact / Data Protection Officer</h3>
              <p className="text-sm">
                {storeName}{business.legalName && business.legalName !== storeName ? ` (${business.legalName})` : ''}<br />
                {business.addressLine1 && <>{business.addressLine1}<br /></>}
                {business.addressLine2 && <>{business.addressLine2}<br /></>}
                {(business.city || business.state || business.postalCode) && <>{business.city}{business.city && business.state ? ', ' : ''}{business.state} {business.postalCode}<br /></>}
                {business.country && <>{business.country}<br /></>}
                {business.phone && <>Phone: {business.phone}<br /></>}
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
