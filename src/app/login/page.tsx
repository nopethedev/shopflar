import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { AuthForm } from '@/components/storefront/auth-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  return (
    <StorefrontLayout settings={settings} categories={categories} bypassModeCheck>
      <div className="container-ecom py-12 md:py-16 max-w-md">
        <AuthForm mode="login" nextUrl={sp.next || '/account'} />
      </div>
    </StorefrontLayout>
  )
}
