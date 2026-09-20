import { db } from '@/lib/db'
import { AdminTaxManager } from '@/components/admin/admin-tax-manager'

export const dynamic = 'force-dynamic'

export default async function AdminTaxPage() {
  const rates = await db.taxRate.findMany({ orderBy: [{ country: 'asc' }, { region: 'asc' }] })
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tax Rates</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure tax rates by country and region (server-side authoritative)</p>
      </div>
      <AdminTaxManager rates={rates} />
    </div>
  )
}
