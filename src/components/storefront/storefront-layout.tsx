import { StoreHeader } from '@/components/storefront/store-header'
import { StoreFooter } from '@/components/storefront/store-footer'
import { SessionProvider } from '@/components/storefront/session-provider'

export async function StorefrontLayout({ children, settings, categories }) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <StoreHeader settings={settings} categories={categories} />
        <main className="flex-1">{children}</main>
        <StoreFooter settings={settings} />
      </div>
    </SessionProvider>
  )
}
