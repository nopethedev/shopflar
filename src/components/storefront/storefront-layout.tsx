import { StoreHeader } from '@/components/storefront/store-header'
import { StoreFooter } from '@/components/storefront/store-footer'
import { SessionProvider } from '@/components/storefront/session-provider'
import { CookieConsentBanner } from '@/components/storefront/cookie-consent-banner'
import { SkipLink } from '@/components/storefront/skip-link'
import { getCustomNavPages, getStoreMode } from '@/lib/settings'
import { StoreModePage } from '@/components/storefront/store-mode-page'
import { getSessionUser } from '@/lib/auth'

export async function StorefrontLayout({ children, settings, categories, bypassModeCheck = false }) {
  const [customPages, storeMode, sessionUser] = await Promise.all([
    getCustomNavPages(),
    getStoreMode(),
    getSessionUser()
  ])

  // Admins bypass maintenance/prelaunch mode so they can preview the store
  // while visitors still see the locked page
  const isAdmin = sessionUser && (sessionUser.role === 'ADMIN' || sessionUser.role === 'SUPER_ADMIN')

  // If store is in maintenance or prelaunch mode, show the mode page instead
  // BUT skip for auth pages (login, signup) and for logged-in admins
  if (!bypassModeCheck && !isAdmin && (storeMode.mode === 'maintenance' || storeMode.mode === 'prelaunch')) {
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
