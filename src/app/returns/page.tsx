import { db } from '@/lib/db'
import { getStoreSettings, getBusinessDetails, getLegalContent } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function ReturnsPage() {
  const [settings, categories, business, customContent] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({ where: { isVisible: true } }),
    getBusinessDetails(),
    getLegalContent('refund_policy')
  ])

  // If admin has written custom content, show that; otherwise show default
  const showCustom = customContent && customContent.length > 0

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Refund &amp; Returns Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {showCustom ? (
          <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: customContent }} />
        ) : (
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <h2 className="text-foreground">Our return window</h2>
            <p>
              We accept returns within <strong>30 days of delivery</strong> for items that are unworn, unwashed, and in their original condition with tags attached. Refunds are issued to the original payment method within 5 business days of receiving your return.
            </p>

            <h2 className="text-foreground">How to start a return</h2>
            <ol>
              <li>Email us at <a href={`mailto:${business.email || settings.storeEmail}`} className="text-foreground hover:underline">{business.email || settings.storeEmail}</a> with your order number</li>
              <li>We&apos;ll send you a prepaid return label (US orders) or return instructions (international)</li>
              <li>Drop off the package at any USPS or local carrier location</li>
              <li>Refunds are processed within 5 business days of receipt</li>
            </ol>

            <h2 className="text-foreground">Exchanges</h2>
            <p>
              For a different size or color, place a new order for the item you want and return the original for a refund. This is faster than waiting for stock to be allocated.
            </p>

            <h2 className="text-foreground">Non-returnable items</h2>
            <ul>
              <li>Items marked as final sale</li>
              <li>Gift cards</li>
              <li>Personalized or custom-made products</li>
              <li>Items that have been worn, washed, or altered</li>
            </ul>

            <h2 className="text-foreground">Damaged or incorrect items</h2>
            <p>
              If you receive a damaged or incorrect item, contact us within 7 days of delivery with a photo and we&apos;ll send a replacement or issue a full refund — no return shipping required.
            </p>

            <h2 className="text-foreground">Refund timing</h2>
            <ul>
              <li>Credit card refunds: 3-5 business days</li>
              <li>PayPal refunds: 1-2 business days</li>
              <li>Cash on delivery refunds: 7-10 business days via bank transfer</li>
            </ul>

            <h2 className="text-foreground">EU Consumer Rights</h2>
            <p>
              <strong>Right of Withdrawal (14 days):</strong> If you are an EU consumer, you have the right to withdraw from your purchase within
              14 days of receiving your order, without giving any reason. You must return the goods within 14 days of notifying us of your withdrawal.
              The cost of return shipping is borne by the consumer unless the item is defective.
            </p>
            <p>
              <strong>Statutory Warranty (2 years):</strong> All products sold to EU consumers are covered by a 2-year legal warranty of conformity.
              If a product is defective or not as described, you are entitled to a repair, replacement, or refund at no cost to you within 2 years of delivery.
            </p>
            <p>
              <strong>Exceptions:</strong> Personalised/custom-made products are exempt from the 14-day right of withdrawal. Digital content downloads
              are exempt once the download has begun with your consent.
            </p>
            <p>
              <strong>Withdrawal Form:</strong> To exercise your right of withdrawal, email us at{' '}
              <a href={`mailto:${business.email || settings.storeEmail}`} className="text-foreground hover:underline">{business.email || settings.storeEmail}</a>{' '}
              with your order number and a statement of withdrawal.
            </p>
            <p>
              <strong>EU Dispute Resolution:</strong> The European Commission provides an online dispute resolution platform at{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">ec.europa.eu/consumers/odr</a>.
              We are not obliged to participate in dispute resolution proceedings before a consumer arbitration body.
            </p>

            {business.businessName && (
              <div className="mt-8 p-4 rounded-md bg-muted/30 border border-border">
                <h3 className="text-foreground font-semibold mb-2">Contact</h3>
                <p className="text-sm">
                  {business.businessName}{business.legalName && business.legalName !== business.businessName ? ` (${business.legalName})` : ''}<br />
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
            )}
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
