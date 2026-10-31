import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { VerifyEmailClient } from '@/components/storefront/verify-email-client'

export const dynamic = 'force-dynamic'

export default async function VerifyEmailPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  return (
    <StorefrontLayout settings={settings} categories={categories} bypassModeCheck>
      <div className="container-ecom py-12 md:py-16 max-w-md">
        <Suspense fallback={
          <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
        }>
          <VerifyEmailClient />
        </Suspense>
      </div>
    </StorefrontLayout>
  )
}
