import { DollarSign, ShoppingCart, Users, Package, TrendingUp, TrendingDown } from 'lucide-react'

export function AdminStatsCards({ totalOrders, totalRevenue, totalCustomers, totalProducts, aov, revenueChange, ordersChange, customersChange, newCustomers30d }) {
  const cards = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'All-time from paid orders',
      icon: DollarSign,
      trend: revenueChange,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      label: 'Orders',
      value: totalOrders.toLocaleString(),
      sub: `${ordersChange >= 0 ? '+' : ''}${ordersChange.toFixed(1)}% vs last 30 days`,
      icon: ShoppingCart,
      trend: ordersChange,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Customers',
      value: totalCustomers.toLocaleString(),
      sub: `${newCustomers30d || 0} new this month`,
      icon: Users,
      trend: customersChange,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Avg Order Value',
      value: `$${aov.toFixed(2)}`,
      sub: 'Revenue ÷ paid orders',
      icon: TrendingUp,
      trend: null,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    },
    {
      label: 'Products',
      value: totalProducts.toLocaleString(),
      sub: 'In catalog',
      icon: Package,
      trend: null,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600'
    }
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className={`h-11 w-11 rounded-lg ${c.iconBg} flex items-center justify-center`}>
              <c.icon className={`h-5 w-5 ${c.iconColor}`} />
            </div>
            {c.trend !== null && (
              <span className={`text-xs font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${c.trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {c.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(c.trend).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold mt-3 tracking-tight">{c.value}</p>
          <p className="text-sm font-medium mt-0.5">{c.label}</p>
          <p className="text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
