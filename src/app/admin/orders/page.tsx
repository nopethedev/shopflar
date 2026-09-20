import { db } from '@/lib/db'
import { AdminOrdersTable } from '@/components/admin/admin-orders-table'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage({ searchParams }) {
  const sp = await searchParams
  const status = sp.status || ''
  const search = sp.search || ''
  const page = parseInt(sp.page || '1')
  const limit = 25

  const where = {
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { orderNumber: { contains: search } },
        { email: { contains: search } }
      ]
    } : {})
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true }
    }),
    db.order.count({ where })
  ])

  const statusCounts = await db.order.groupBy({
    by: ['status'],
    _count: { _all: true }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} orders</p>
      </div>
      <AdminOrdersTable orders={orders} total={total} page={page} limit={limit} status={status} search={search} statusCounts={statusCounts} />
    </div>
  )
}
