import { TrendingUp } from 'lucide-react'

export function AdminTopProducts({ products }) {
  const maxRevenue = Math.max(...products.map(p => p.revenue || p._sum?.quantity || 0), 1)

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top Products by Revenue</h2>
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No sales data yet.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => {
            const revenue = p.revenue || 0
            const quantity = p.quantity || p._sum?.quantity || 0
            return (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{quantity} sold</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden w-24">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${Math.min(100, (revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right">${revenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
