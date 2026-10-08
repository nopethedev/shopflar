import { db } from '@/lib/db'
import { AdminStatsCards } from '@/components/admin/admin-stats-cards'
import { AdminSalesChart } from '@/components/admin/admin-sales-chart'
import { AdminRecentOrders } from '@/components/admin/admin-recent-orders'
import { AdminLowStock } from '@/components/admin/admin-low-stock'
import { AdminTopProducts } from '@/components/admin/admin-top-products'
import { AdminOrderStatusBreakdown } from '@/components/admin/admin-order-status-breakdown'
import { AdminCustomerGrowth } from '@/components/admin/admin-customer-growth'
import { AdminRecentSubscribers } from '@/components/admin/admin-recent-subscribers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Download, DollarSign, ShoppingCart, Users, TrendingUp, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    totalOrders, totalRevenue, totalCustomers, totalProducts,
    recentOrders, lowStockProducts, topProductsByQty, topProductsByRevenue,
    dailyStats, last30Stats, prev30Stats,
    newCustomers30d, newCustomersPrev30d,
    ordersThisMonth, ordersLastMonth,
    revenueThisMonth, revenueLastMonth,
    pendingOrders, lowStockCount,
    recentSubscribers, newsletterCount,
    recentReviews, pendingReviewsCount,
    orderStatusCounts
  ] = await Promise.all([
    db.order.count(),
    db.order.aggregate({ _sum: { total: true }, where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.product.count(),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    }),
    db.product.findMany({
      where: { trackInventory: true, isOutOfStock: false, inventoryQty: { lte: 5 } },
      take: 6,
      orderBy: { inventoryQty: 'asc' },
      include: { images: { take: 1 } }
    }),
    db.orderItem.groupBy({
      by: ['name'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }),
    db.orderItem.groupBy({
      by: ['name'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }),
    getDailyStats(14),
    getRangeStats(thirtyDaysAgo, now),
    getRangeStats(sixtyDaysAgo, thirtyDaysAgo),
    db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }),
    db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    db.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.order.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: thirtyDaysAgo }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }),
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }),
    db.order.count({ where: { status: 'PENDING' } }),
    db.product.count({ where: { trackInventory: true, inventoryQty: { lte: 5 }, isOutOfStock: false } }),
    db.newsletterSubscriber.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    db.newsletterSubscriber.count(),
    db.productReview.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true, slug: true } } } }),
    db.productReview.count({ where: { isApproved: false } }),
    db.order.groupBy({ by: ['status'], _count: { _all: true } })
  ])

  // Calculate derived metrics
  const paidOrders = await db.order.count({ where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } })
  const aov = paidOrders > 0 ? (totalRevenue._sum.total || 0) / paidOrders : 0
  const revenueChange = revenueLastMonth._sum.total > 0
    ? ((revenueThisMonth._sum.total - revenueLastMonth._sum.total) / revenueLastMonth._sum.total * 100)
    : 0
  const ordersChange = ordersLastMonth > 0
    ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth * 100)
    : 0
  const customersChange = newCustomersPrev30d > 0
    ? ((newCustomers30d - newCustomersPrev30d) / newCustomersPrev30d * 100)
    : 0

  // Get top products by revenue (need to fetch prices)
  const topProductNames = topProductsByRevenue.map(p => p.name)
  const topProductsData = await db.orderItem.findMany({
    where: { name: { in: topProductNames } },
    select: { name: true, price: true, quantity: true }
  })
  const revenueByProduct = {}
  for (const it of topProductsData) {
    revenueByProduct[it.name] = (revenueByProduct[it.name] || 0) + (it.price * it.quantity)
  }
  const topProductsByRevenueFormatted = topProductNames.map(name => ({
    name,
    revenue: revenueByProduct[name] || 0,
    quantity: topProductsByRevenue.find(p => p.name === name)?._sum.quantity || 0
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your store performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/products/new"><Plus className="h-4 w-4 mr-2" /> Add Product</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders"><Download className="h-4 w-4 mr-2" /> Export Orders</Link>
          </Button>
        </div>
      </div>

      {/* Quick alerts */}
      {(pendingOrders > 0 || lowStockCount > 0 || pendingReviewsCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingOrders > 0 && (
            <Link href="/admin/orders?status=PENDING" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors">
              <Activity className="h-3.5 w-3.5" /> {pendingOrders} pending order{pendingOrders !== 1 ? 's' : ''}
            </Link>
          )}
          {lowStockCount > 0 && (
            <Link href="/admin/products" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors">
              <TrendingUp className="h-3.5 w-3.5" /> {lowStockCount} low-stock product{lowStockCount !== 1 ? 's' : ''}
            </Link>
          )}
          {pendingReviewsCount > 0 && (
            <Link href="/admin/reviews?filter=pending" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors">
              <Activity className="h-3.5 w-3.5" /> {pendingReviewsCount} review{pendingReviewsCount !== 1 ? 's' : ''} to moderate
            </Link>
          )}
        </div>
      )}

      {/* Stats with trend comparisons */}
      <AdminStatsCards
        totalOrders={totalOrders}
        totalRevenue={totalRevenue._sum.total || 0}
        totalCustomers={totalCustomers}
        totalProducts={totalProducts}
        aov={aov}
        revenueChange={revenueChange}
        ordersChange={ordersChange}
        customersChange={customersChange}
        newCustomers30d={newCustomers30d}
      />

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminSalesChart dailyStats={dailyStats} />
        </div>
        <AdminOrderStatusBreakdown statusCounts={orderStatusCounts} />
      </div>

      {/* Top products by revenue */}
      <AdminTopProducts products={topProductsByRevenueFormatted} />

      {/* Customer growth + newsletter */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AdminCustomerGrowth
          newThisMonth={newCustomers30d}
          newLastMonth={newCustomersPrev30d}
          change={customersChange}
          totalCustomers={totalCustomers}
        />
        <AdminRecentSubscribers
          subscribers={recentSubscribers}
          total={newsletterCount}
        />
      </div>

      {/* Recent orders + low stock */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AdminRecentOrders orders={recentOrders} />
        <AdminLowStock products={lowStockProducts} />
      </div>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Reviews</h2>
            <Link href="/admin/reviews" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentReviews.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.product?.name || 'Unknown product'}</p>
                  <p className="text-xs text-muted-foreground">by {r.authorName} — {r.body?.slice(0, 80)}{r.body?.length > 80 ? '...' : ''}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < r.rating ? 'text-amber-500' : 'text-muted'}`}>★</span>
                    ))}
                  </div>
                  {!r.isApproved && <span className="text-[10px] text-amber-600 font-medium">PENDING</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

async function getDailyStats(days) {
  const now = new Date()
  const stats = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const next = new Date(date)
    next.setDate(date.getDate() + 1)
    const orders = await db.order.findMany({
      where: { createdAt: { gte: date, lt: next }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      select: { total: true }
    })
    stats.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      revenue: orders.reduce((s, o) => s + o.total, 0),
      orders: orders.length
    })
  }
  return stats
}

async function getRangeStats(start, end) {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
    },
    select: { total: true }
  })
  return {
    revenue: orders.reduce((s, o) => s + o.total, 0),
    orders: orders.length
  }
}
