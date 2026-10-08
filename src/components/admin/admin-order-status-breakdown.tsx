'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = {
  PENDING: '#f59e0b',
  PAYMENT_PENDING: '#f59e0b',
  PAID: '#10b981',
  PROCESSING: '#3b82f6',
  SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
  REFUNDED: '#ef4444',
  FAILED: '#ef4444'
}

const LABELS = {
  PENDING: 'Pending',
  PAYMENT_PENDING: 'Payment Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  FAILED: 'Failed'
}

export function AdminOrderStatusBreakdown({ statusCounts }) {
  const data = (statusCounts || [])
    .map(s => ({
      name: LABELS[s.status] || s.status,
      value: s._count._all,
      status: s.status
    }))
    .filter(d => d.value > 0)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background p-5">
        <h2 className="font-semibold mb-4">Order Status</h2>
        <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h2 className="font-semibold mb-4">Order Status</h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.status] || '#999'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 90%)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => [`${value} order${value !== 1 ? 's' : ''}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.map(d => (
          <div key={d.status} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[d.status] || '#999' }} />
              {d.name}
            </span>
            <span className="font-medium">
              {d.value}
              <span className="text-muted-foreground ml-1">({((d.value / total) * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
