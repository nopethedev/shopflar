import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AdminDiscountsTable } from '@/components/admin/admin-discounts-table'

export const dynamic = 'force-dynamic'

export default async function AdminDiscountsPage() {
  const discounts = await db.discount.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { usage: true } } }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="text-sm text-muted-foreground mt-1">{discounts.length} discount codes</p>
        </div>
        <Button asChild>
          <Link href="/admin/discounts/new"><Plus className="h-4 w-4 mr-2" /> New Discount</Link>
        </Button>
      </div>
      <AdminDiscountsTable discounts={discounts} />
    </div>
  )
}
