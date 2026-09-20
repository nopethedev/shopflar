import { db } from '@/lib/db'
import { getPaymentSettings } from '@/lib/payments'
import { AdminPaymentsManager } from '@/components/admin/admin-payments-manager'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const settings = await getPaymentSettings()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">Enable and configure payment methods for checkout</p>
      </div>
      <AdminPaymentsManager settings={settings} />
    </div>
  )
}
