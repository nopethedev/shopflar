import { db } from '@/lib/db'
import { AdminStatsCards } from '@/components/admin/admin-stats-cards'
import { AdminSalesChart } from '@/components/admin/admin-sales-chart'
import { AdminRecentOrders } from '@/components/admin/admin-recent-orders'
import { AdminLowStock } from '@/components/admin/admin-low-stock'
import { AdminTopProducts } from '@/components/admin/admin-top-products'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [
    totalOrders, totalRevenue, totalCustomers, totalProducts,
    recentOrders, lowStockProducts, topProducts, dailyStats
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
    getDailyStats()
  ])

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

      <AdminStatsCards
        totalOrders={totalOrders}
        totalRevenue={totalRevenue._sum.total || 0}
        totalCustomers={totalCustomers}
        totalProducts={totalProducts}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminSalesChart dailyStats={dailyStats} />
        </div>
        <AdminTopProducts products={topProducts} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <AdminRecentOrders orders={recentOrders} />
        <AdminLowStock products={lowStockProducts} />
      </div>
    </div>
  )
}

async function getDailyStats() {
  const days = 14
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
