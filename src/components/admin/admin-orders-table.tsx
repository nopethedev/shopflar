'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'

const statusStyles = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  REFUNDED: 'bg-rose-100 text-rose-700',
  FAILED: 'bg-rose-100 text-rose-700'
}

const STATUSES = ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED']

export function AdminOrdersTable({ orders, total, page, limit, status, search, statusCounts }) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)

  const countMap = new Map(statusCounts.map(s => [s.status, s._count._all]))

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => router.push('/admin/orders')}
          className={`px-3 py-1.5 text-xs rounded-md font-medium ${!status ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
        >
          All ({total})
        </button>
        {STATUSES.map(s => {
          const c = countMap.get(s) || 0
          if (c === 0) return null
          return (
            <button
              key={s}
              onClick={() => router.push(`/admin/orders?status=${s}`)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium ${status === s ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
            >
              {s.replace('_', ' ')} ({c})
            </button>
          )
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); router.push(`/admin/orders?search=${encodeURIComponent(searchInput)}`) }} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search order # or email..." className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : orders.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.orderNumber}</TableCell>
                <TableCell>
                  <p className="text-sm">{o.shippingAddress?.firstName} {o.shippingAddress?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{o.email}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">
                  {o.items.reduce((n, it) => n + it.quantity, 0)}
                </TableCell>
                <TableCell className="font-semibold">${o.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={o.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                    {o.paymentStatus.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${statusStyles[o.status] || 'bg-muted'}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium hover:underline text-foreground">
                      View
                    </Link>
                    {o.paymentStatus === 'PAID' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED' && (
                      <FulfillButton orderId={o.id} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => router.push(`/admin/orders?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / limit)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => router.push(`/admin/orders?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function FulfillButton({ orderId }) {
  const router = useRouter()
  const [fulfilling, setFulfilling] = useState(false)
  const [fulfilled, setFulfilled] = useState(false)

  const fulfill = async () => {
    if (!confirm('Send this order to the fulfillment provider?')) return
    setFulfilling(true)
    try {
      // Try the first available provider — in practice, the admin would pick from Admin → Fulfillment
      // This sends to whichever provider is enabled and configured
      const r = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'printful' })
      })
      if (r.ok) {
        setFulfilled(true)
        toast.success('Order sent for fulfillment')
        router.refresh()
      } else {
        const d = await r.json()
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Fulfillment failed', e.message)
    } finally {
      setFulfilling(false)
    }
  }

  if (fulfilled) {
    return <span className="text-xs text-emerald-600 font-medium">✓ Fulfilled</span>
  }

  return (
    <button
      onClick={fulfill}
      disabled={fulfilling}
      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
    >
      {fulfilling ? 'Sending...' : 'Fulfill'}
    </button>
  )
}
