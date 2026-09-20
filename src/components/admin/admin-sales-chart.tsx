'use client'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export function AdminSalesChart({ dailyStats }) {
  const max = Math.max(...dailyStats.map(d => d.revenue), 100)

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">Revenue</h2>
          <p className="text-xs text-muted-foreground">Last 14 days</p>
        </div>
        <p className="text-2xl font-bold">
          ${dailyStats.reduce((s, d) => s + d.revenue, 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyStats}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 0% 10%)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(0 0% 10%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(0 0% 60%)" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(0 0% 60%)" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 90%)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name === 'revenue' ? 'Revenue' : name]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(0 0% 10%)"
              strokeWidth={2}
              fill="url(#rev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
