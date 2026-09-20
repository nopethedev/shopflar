import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { AccountDashboard } from '@/components/storefront/account-dashboard'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/account')

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { items: true }
  })
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: 'desc' } })
  const wishlistItems = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: { include: { images: true } } }
  })

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-8 md:py-12">
        <AccountDashboard user={user} orders={orders} addresses={addresses} wishlistItems={wishlistItems.map(w => w.product)} />
      </div>
    </StorefrontLayout>
  )
}
