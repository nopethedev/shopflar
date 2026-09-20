import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const statusStyles = {
  PENDING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  PAID: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  PROCESSING: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  SHIPPED: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  DELIVERED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  CANCELLED: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  REFUNDED: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  FAILED: 'bg-rose-100 text-rose-700 hover:bg-rose-100'
}

export function AdminRecentOrders({ orders }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Recent Orders</h2>
        <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {orders.map(o => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-md"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground truncate">{o.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">${o.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={`shrink-0 ${statusStyles[o.status]}`}>
                {o.status.replace('_', ' ')}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
