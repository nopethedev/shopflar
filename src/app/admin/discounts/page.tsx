import { db } from '@/lib/db'
import Link from 'next/link'
import { AdminDiscountsTable } from '@/components/admin/admin-discounts-table'

export const dynamic = 'force-dynamic'

export default async function AdminDiscountsPage() {
  const discounts = await db.discount.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { usage: true } } }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Discounts</h1>
          <p className="text-[13px] text-[#616161] mt-0.5">
            Offer codes and free shipping to boost conversion.
          </p>
        </div>
        <Link href="/admin/discounts/new" className="sf-btn sf-btn-primary">
          Create discount
        </Link>
      </div>
      <AdminDiscountsTable discounts={discounts} />
    </div>
  )
}
