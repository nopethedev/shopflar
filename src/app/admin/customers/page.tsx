import { db } from '@/lib/db'
import { AdminCustomersTable } from '@/components/admin/admin-customers-table'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage({ searchParams }) {
  const sp = await searchParams
  const search = String(sp.search || '')
  const segment = String(sp.segment || 'all')

  const [users, subscribers, totalCustomers, newCustomers] = await Promise.all([
    db.user.findMany({
      where: {
        role: 'CUSTOMER',
        ...(search ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } }
          ]
        } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        profile: true,
        addresses: true,
        orders: { select: { id: true, total: true, createdAt: true, status: true } }
      }
    }),
    db.newsletterSubscriber.findMany({ select: { email: true, isActive: true } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } })
  ])

  const subscriberEmails = new Set(subscribers.filter(s => s.isActive).map(s => s.email.toLowerCase()))
  const now = Date.now()

  const customers = users.map(u => {
    const validOrders = u.orders.filter(o => !['CANCELLED', 'FAILED'].includes(o.status))
    const spent = validOrders.reduce((s, o) => s + o.total, 0)
    const lastOrder = u.orders.length
      ? u.orders.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b))
      : null
    const daysSinceLastOrder = lastOrder ? Math.floor((now - new Date(lastOrder.createdAt).getTime()) / 86400000) : null
    const isNew = new Date(u.createdAt).getTime() > now - 30 * 86400000
    const segments: string[] = []
    if (isNew) segments.push('new')
    if (validOrders.length >= 2) segments.push('returning')
    if (validOrders.length >= 3 || spent >= 500) segments.push('loyal')
    if (daysSinceLastOrder !== null && daysSinceLastOrder > 60) segments.push('at-risk')
    if (subscriberEmails.has(u.email.toLowerCase())) segments.push('subscriber')

    return {
      id: u.id,
      name: u.profile?.firstName || u.name || u.email.split('@')[0],
      firstName: u.profile?.firstName || '',
      lastName: u.profile?.lastName || '',
      email: u.email,
      createdAt: u.createdAt,
      orderCount: validOrders.length,
      totalSpent: spent,
      lastOrderAt: lastOrder?.createdAt || null,
      city: u.addresses.find(a => a.isDefault)?.city || u.addresses[0]?.city || '',
      country: u.addresses.find(a => a.isDefault)?.country || u.addresses[0]?.country || '',
      segments,
      verified: !!u.emailVerified
    }
  })

  const returning = customers.filter(c => c.segments.includes('returning')).length
  const loyal = customers.filter(c => c.segments.includes('loyal')).length
  const atRisk = customers.filter(c => c.segments.includes('at-risk')).length
  const activeSubscribers = subscribers.filter(s => s.isActive).length
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Customers</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Customers</h1>
          <p className="sf-sub mt-0.5">Understand who shops with you and how much they spend.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="sf-badge sf-badge-neutral">{totalCustomers} total customers</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Customers" value={totalCustomers.toLocaleString()} sub={`${newCustomers} new in 30 days`} />
        <StatCard label="Returning" value={returning.toLocaleString()} sub={customers.length ? `${Math.round((returning / Math.max(customers.length, 1)) * 100)}% of customers` : 'No orders yet'} />
        <StatCard label="Loyal" value={loyal.toLocaleString()} sub="3+ orders or $500+" />
        <StatCard label="Customer value" value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${activeSubscribers} email subscribers`} />
      </div>

      <AdminCustomersTable
        customers={customers}
        segment={segment}
        search={search}
        counts={{ all: customers.length, new: customers.filter(c => c.segments.includes('new')).length, returning, loyal, 'at-risk': atRisk, subscriber: customers.filter(c => c.segments.includes('subscriber')).length }}
      />
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="sf-card p-4">
      <p className="text-[12px] text-[#616161]">{label}</p>
      <p className="text-[22px] font-semibold text-[#1a1a1a] tracking-tight mt-1">{value}</p>
      <p className="text-[11px] text-[#8a8a8a] mt-0.5">{sub}</p>
    </div>
  )
}
