import { db } from '@/lib/db'
import { AdminCustomersTable } from '@/components/admin/admin-customers-table'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage({ searchParams }) {
  const sp = await searchParams
  const search = sp.search || ''
  const page = parseInt(sp.page || '1')
  const limit = 25

  const where = {
    role: 'CUSTOMER',
    ...(search ? {
      OR: [
        { email: { contains: search } },
        { name: { contains: search } }
      ]
    } : {})
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        profile: true,
        orders: { select: { id: true, total: true, createdAt: true, status: true }, take: 1, orderBy: { createdAt: 'desc' } }
      }
    }),
    db.user.count({ where })
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} registered customers</p>
      </div>
      <AdminCustomersTable customers={users} total={total} page={page} limit={limit} search={search} />
    </div>
  )
}
