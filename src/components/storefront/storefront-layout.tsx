import { StoreHeader } from '@/components/storefront/store-header'
import { StoreFooter } from '@/components/storefront/store-footer'
import { SessionProvider } from '@/components/storefront/session-provider'
import { CookieConsentBanner } from '@/components/storefront/cookie-consent-banner'
import { SkipLink } from '@/components/storefront/skip-link'
import { getCustomNavPages, getStoreMode } from '@/lib/settings'
import { StoreModePage } from '@/components/storefront/store-mode-page'

export async function StorefrontLayout({ children, settings, categories }) {
  const [customPages, storeMode] = await Promise.all([
    getCustomNavPages(),
    getStoreMode()
  ])

  // If store is in maintenance or prelaunch mode, show the mode page instead
  // Admin routes are NOT affected (they use a separate layout)
  if (storeMode.mode === 'maintenance' || storeMode.mode === 'prelaunch') {
    return (
      <SessionProvider>
        <StoreModePage mode={storeMode.mode} config={storeMode} settings={settings} />
      </SessionProvider>
    )
  }

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
