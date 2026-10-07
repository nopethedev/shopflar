import { StoreHeader } from '@/components/storefront/store-header'
import { StoreFooter } from '@/components/storefront/store-footer'
import { SessionProvider } from '@/components/storefront/session-provider'
import { CookieConsentBanner } from '@/components/storefront/cookie-consent-banner'
import { SkipLink } from '@/components/storefront/skip-link'
import { getCustomNavPages } from '@/lib/settings'

export async function StorefrontLayout({ children, settings, categories }) {
  const customPages = await getCustomNavPages()
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <SkipLink />
        <StoreHeader settings={settings} categories={categories} customPages={customPages} />
        <main id="main-content" className="flex-1">{children}</main>
        <StoreFooter settings={settings} />
        <CookieConsentBanner />
      </div>
    </SessionProvider>
  )
}
