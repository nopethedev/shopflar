import { db } from '@/lib/db'
import { getStoreSettings, getBusinessDetails, getLegalContent } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'

export const dynamic = 'force-dynamic'

export default async function CookiesPage() {
  const [settings, categories, business, customContent] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({ where: { isVisible: true } }),
    getBusinessDetails(),
    getLegalContent('cookie_policy')
  ])

  const showCustom = customContent && customContent.length > 0
  const storeName = business.businessName || settings.storeName

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        {showCustom ? (
          <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: customContent }} />
        ) : (
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="text-foreground">
              This Cookie Policy explains how {storeName} uses cookies and similar technologies when you visit our website.
            </p>

            <h2 className="text-foreground">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help us recognize your browser, remember your preferences, and improve your browsing experience.
            </p>

            <h2 className="text-foreground">Types of cookies we use</h2>

            <h3 className="text-foreground">Essential cookies (always on)</h3>
            <p>Required for the website to function correctly. These cannot be disabled.</p>
            <ul>
              <li><strong>Session cookie</strong>: identifies your logged-in session</li>
              <li><strong>Cart cookie</strong>: remembers items in your shopping cart</li>
              <li><strong>CSRF token</strong>: protects forms from cross-site request forgery</li>
            </ul>

            <h3 className="text-foreground">Analytics cookies (optional)</h3>
            <p>Help us understand how visitors use our site so we can improve it.</p>
            <ul>
              <li>Page views and popular products</li>
              <li>Search queries</li>
              <li>Error rates</li>
            </ul>

            <h3 className="text-foreground">Marketing cookies (optional)</h3>
            <p>Used to show you relevant ads on other platforms. Only enabled if you opt in.</p>

            <h2 className="text-foreground">Managing cookies</h2>
            <p>
              You can manage your cookie preferences at any time using the banner that appears at the bottom of the page, or by clearing your browser storage in your browser settings.
            </p>

            <h2 className="text-foreground">Third-party services</h2>
            <p>
              If you enable payment providers like Stripe or PayPal, those services may set their own cookies during checkout. See their respective policies:
            </p>
            <ul>
              <li><a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">Stripe Cookie Policy</a></li>
              <li><a href="https://www.paypal.com/us/webapps/mpp/ua/cookie-full" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">PayPal Cookie Policy</a></li>
            </ul>

            <h2 className="text-foreground">Your rights</h2>
            <p>
              Depending on your location, you may have rights under laws like the GDPR (EU/UK), CCPA (California), or similar regulations. These include the right to:
            </p>
            <ul>
              <li>Know what cookies are used</li>
              <li>Opt out of non-essential cookies</li>
              <li>Request deletion of your data</li>
              <li>Access a copy of your data</li>
            </ul>

            <div className="mt-8 p-4 rounded-md bg-muted/30 border border-border">
              <h3 className="text-foreground font-semibold mb-2">Contact</h3>
              <p className="text-sm">
                {storeName}<br />
                {business.addressLine1 && <>{business.addressLine1}<br /></>}
                {(business.city || business.state || business.postalCode) && <>{business.city}{business.city && business.state ? ', ' : ''}{business.state} {business.postalCode}<br /></>}
                {business.country && <>{business.country}<br /></>}
                Email: <a href={`mailto:${business.email || settings.storeEmail}`} className="text-foreground hover:underline">{business.email || settings.storeEmail}</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  )
}
