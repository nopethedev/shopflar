import { DollarSign, ShoppingCart, Users, Package } from 'lucide-react'

export function AdminStatsCards({ totalOrders, totalRevenue, totalCustomers, totalProducts }) {
  const cards = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Last 30 days',
      icon: DollarSign,
      trend: '+12.5%',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      label: 'Orders',
      value: totalOrders.toLocaleString(),
      sub: 'All-time',
      icon: ShoppingCart,
      trend: '+8.2%',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Customers',
      value: totalCustomers.toLocaleString(),
      sub: 'Registered',
      icon: Users,
      trend: '+5.4%',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Products',
      value: totalProducts.toLocaleString(),
      sub: 'In catalog',
      icon: Package,
      trend: '0',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    }
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className={`h-11 w-11 rounded-lg ${c.iconBg} flex items-center justify-center`}>
              <c.icon className={`h-5 w-5 ${c.iconColor}`} />
            </div>
            <span className={`text-xs font-semibold ${c.trend.startsWith('+') ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-muted-foreground'}`}>
              {c.trend}
            </span>
          </div>
          <p className="text-2xl font-bold mt-3 tracking-tight">{c.value}</p>
          <p className="text-sm font-medium mt-0.5">{c.label}</p>
          <p className="text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
