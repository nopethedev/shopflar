import { db } from '@/lib/db'
import { getBusinessDetails } from '@/lib/settings'
import { AdminBusinessForm } from '@/components/admin/admin-business-form'

export const dynamic = 'force-dynamic'

export default async function AdminBusinessPage() {
  const business = await getBusinessDetails()
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Business Details</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Optional — used in legal pages, invoices, and footer. Leave blank if you don&apos;t have a registered business.
        </p>
      </div>
      <AdminBusinessForm initial={business} />
    </div>
  )
}
