import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { AuthForm } from '@/components/storefront/auth-form'
import { isDemoMode, demoAdminEmail, usesDefaultDemoPassword, demoAdminPassword } from '@/lib/demo'
import { FlaskConical } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })

  return (
    <StorefrontLayout settings={settings} categories={categories} bypassModeCheck>
      <div className="container-ecom py-12 md:py-16 max-w-md">
        {isDemoMode() && (
          <div className="mb-4 rounded-xl border border-[#f0d9a8] bg-[#fffaf0] p-3.5">
            <p className="text-[12px] font-semibold text-[#5c3300] flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> Demo store
            </p>
            <p className="text-[11px] text-[#8a4b00] mt-1">
              Sign in to try the admin, then the theme editor. Changes reset after 30 minutes of inactivity.
            </p>
            <p className="text-[11px] text-[#5c3300] mt-2 font-mono">
              {demoAdminEmail()}
              {usesDefaultDemoPassword() && ` / ${demoAdminPassword()}`}
            </p>
          </div>
        )}
        <AuthForm
          mode="login"
          nextUrl={sp.next || undefined}
          demoCredentials={
            isDemoMode()
              ? `${demoAdminEmail()} / ${usesDefaultDemoPassword() ? demoAdminPassword() : 'password from DEMO_ADMIN_PASSWORD'}`
              : undefined
          }
        />
      </div>
    </StorefrontLayout>
  )
}
