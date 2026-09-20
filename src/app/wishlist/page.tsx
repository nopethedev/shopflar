import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { WishlistView } from '@/components/storefront/wishlist-view'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-8 md:py-12">
        <WishlistView />
      </div>
    </StorefrontLayout>
  )
}
