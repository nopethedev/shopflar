import { db } from '@/lib/db'
import { AdminShippingManager } from '@/components/admin/admin-shipping-manager'

export const dynamic = 'force-dynamic'

export default async function AdminShippingPage() {
  const methods = await db.shippingMethod.findMany({ orderBy: { sortOrder: 'asc' } })
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Shipping</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure shipping methods available at checkout</p>
      </div>
      <AdminShippingManager methods={methods} />
    </div>
  )
}
