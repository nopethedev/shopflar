import { db } from '@/lib/db'
import { getFulfillmentSettings } from '@/lib/fulfillment'
import { AdminFulfillmentManager } from '@/components/admin/admin-fulfillment-manager'

export const dynamic = 'force-dynamic'

export default async function AdminFulfillmentPage() {
  const settings = await getFulfillmentSettings()
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Fulfillment Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect print-on-demand and dropshipping providers. Orders with linked products are automatically sent to the provider when paid.
        </p>
      </div>
      <AdminFulfillmentManager settings={settings} />
    </div>
  )
}
