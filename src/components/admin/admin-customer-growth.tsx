'use client'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Users, TrendingUp, TrendingDown } from 'lucide-react'

export function AdminCustomerGrowth({ newThisMonth, newLastMonth, change, totalCustomers }) {
  const data = [
    { label: 'Last 30 days', value: newLastMonth, fill: '#d1d5db' },
    { label: 'This month', value: newThisMonth, fill: '#8b5cf6' }
  ]

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Customer Growth</h2>
          <p className="text-xs text-muted-foreground mt-0.5">New signups — this month vs last month</p>
        </div>
        <span className={`text-xs font-semibold inline-flex items-center gap-0.5 px-2 py-1 rounded ${change >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">New this month</p>
          <p className="text-2xl font-bold mt-1">{newThisMonth}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Total customers</p>
          <p className="text-2xl font-bold mt-1">{totalCustomers}</p>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(0 0% 60%)" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(0 0% 60%)" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(0 0% 90%)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value) => [`${value} new customer${value !== 1 ? 's' : ''}`, 'Signups']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
