import { db } from '@/lib/db'
import { AdminOrdersTable } from '@/components/admin/admin-orders-table'

export const dynamic = 'force-dynamic'

const ARCHIVED = ['CANCELLED', 'REFUNDED', 'FAILED']
const OPEN = ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED']

function tabWhere(tab: string) {
  switch (tab) {
    case 'unfulfilled':
      return { fulfillmentStatus: { not: 'FULFILLED' }, status: { notIn: ARCHIVED } }
    case 'unpaid':
      return { paymentStatus: { not: 'PAID' }, status: { notIn: ARCHIVED } }
    case 'open':
      return { status: { in: OPEN } }
    case 'archived':
      return { status: { in: ARCHIVED } }
    default:
      return {}
  }
}

export default async function AdminOrdersPage({ searchParams }) {
  const sp = await searchParams
  const tab = sp.tab || 'all'
  const search = (sp.search || '').trim()
  const statusFilter = sp.status || ''
  const page = Math.max(1, parseInt(sp.page || '1') || 1)
  const limit = 25

  const filters: any[] = []
  if (statusFilter) filters.push({ status: statusFilter })
  const tabFilter = tabWhere(tab)
  if (Object.keys(tabFilter).length) filters.push(tabFilter)
  if (search) {
    filters.push({
      OR: [
        { orderNumber: { contains: search } },
        { email: { contains: search } }
      ]
    })
  }
  const where = filters.length ? { AND: filters } : {}

  const [orders, total, all, unfulfilled, unpaid, open, archived] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true }
    }),
    db.order.count({ where }),
    db.order.count(),
    db.order.count({ where: tabWhere('unfulfilled') }),
    db.order.count({ where: tabWhere('unpaid') }),
    db.order.count({ where: tabWhere('open') }),
    db.order.count({ where: tabWhere('archived') })
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Orders</h1>
          <p className="text-[13px] text-[#616161] mt-0.5">
            Track fulfillment, payments and customer details.
          </p>
        </div>
      </div>

      <AdminOrdersTable
        orders={orders}
        total={total}
        page={page}
        limit={limit}
        tab={tab}
        search={search}
        statusFilter={statusFilter}
        counts={{ all, unfulfilled, unpaid, open, archived }}
      />
    </div>
  )
}
