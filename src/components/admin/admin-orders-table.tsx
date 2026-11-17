'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  Search, ChevronLeft, ChevronRight, Download, CheckCircle2,
  ShoppingBag, PackageCheck, ChevronRight as Chevron
} from 'lucide-react'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unfulfilled', label: 'Unfulfilled' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'open', label: 'Open' },
  { id: 'archived', label: 'Archived' }
]

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'sf-badge-success' },
  UNPAID: { label: 'Unpaid', cls: 'sf-badge-warning' },
  PENDING: { label: 'Pending', cls: 'sf-badge-warning' },
  REFUNDED: { label: 'Refunded', cls: 'sf-badge-danger' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', cls: 'sf-badge-info' }
}

const FULFILLMENT_BADGE: Record<string, { label: string; cls: string }> = {
  FULFILLED: { label: 'Fulfilled', cls: 'sf-badge-success' },
  PARTIAL: { label: 'Partially fulfilled', cls: 'sf-badge-info' },
  UNFULFILLED: { label: 'Unfulfilled', cls: 'sf-badge-neutral' }
}

const money = (cents: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD' }).format(cents)
  } catch {
    return `$${cents.toFixed(2)}`
  }
}

const customerName = (o: any) => {
  const a = o.shippingAddress || {}
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ')
  return name || o.email.split('@')[0]
}

export function AdminOrdersTable({ orders, total, page, limit, tab, search, statusFilter, counts }) {
  const router = useRouter()
  const [query, setQuery] = useState(search)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const pages = Math.max(1, Math.ceil(total / limit))
  // Archived orders can't be fulfilled; keep them out of selection entirely.
  const ARCHIVED_STATUSES = ['CANCELLED', 'REFUNDED', 'FAILED']
  const canFulfill = (o: any) => !ARCHIVED_STATUSES.includes(o.status)
  const eligibleOrders = orders.filter(canFulfill)
  const allSelected = eligibleOrders.length > 0 && eligibleOrders.every(o => selected.includes(o.id))
  const eligibleSelected = orders.filter(o => selected.includes(o.id) && canFulfill(o))

  const go = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    const merged = { tab: tab === 'all' ? undefined : tab, search: search || undefined, status: statusFilter || undefined, page: undefined, ...next }
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 1) params.set(k, String(v))
    })
    const qs = params.toString()
    router.push(`/admin/orders${qs ? `?${qs}` : ''}`)
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setSelected([])
    go({ search: query.trim() || undefined, page: 1 })
  }

  const changeTab = (id: string) => {
    setSelected([])
    go({ tab: id === 'all' ? undefined : id, status: undefined, page: 1 })
  }

  const exportCsv = () => {
    const source = selected.length ? orders.filter(o => selected.includes(o.id)) : orders
    const lines = ['order,date,customer,email,total,payment,fulfillment']
    source.forEach(o => {
      lines.push([
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        `"${customerName(o)}"`,
        o.email,
        o.total.toFixed(2),
        o.paymentStatus,
        o.fulfillmentStatus
      ].join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', `${source.length} order${source.length === 1 ? '' : 's'}`)
  }

  const markFulfilled = async () => {
    if (!eligibleSelected.length) {
      toast.error('Nothing to fulfill', 'Cancelled and refunded orders cannot be fulfilled.')
      return
    }
    setBusy(true)
    let done = 0
    for (const id of eligibleSelected.map(o => o.id)) {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillmentStatus: 'FULFILLED' })
      })
      if (r.ok) done++
    }
    setBusy(false)
    const skipped = selected.length - eligibleSelected.length
    setSelected([])
    if (done) {
      toast.success(
        `${done} order${done === 1 ? '' : 's'} marked as fulfilled`,
        skipped ? `${skipped} cancelled or refunded order${skipped === 1 ? '' : 's'} skipped` : undefined
      )
    } else toast.error('Could not update orders')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {TABS.map(t => {
          const count = counts?.[t.id] ?? 0
          const active = tab === t.id || (t.id === 'all' && tab !== 'unfulfilled' && tab !== 'unpaid' && tab !== 'open' && tab !== 'archived')
          return (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors',
                active
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                  : 'bg-white text-[#303030] border-[#d9d9d9] hover:bg-[#fafafa]'
              )}
            >
              {t.label}
              <span className={cn('text-[10px] px-1.5 rounded-full', active ? 'bg-white/20' : 'bg-[#f1f1f1] text-[#616161]')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="sf-card overflow-hidden">
        {/* Toolbar */}
        {selected.length > 0 ? (
          <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 border-b border-[#e3e3e3] bg-[#f8fafc]">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="sf-badge sf-badge-info">{selected.length} selected</span>
              <button onClick={() => setSelected([])} className="text-[#005bd3] hover:underline">Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className="sf-btn sf-btn-secondary">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button onClick={markFulfilled} disabled={busy} className="sf-btn sf-btn-primary disabled:opacity-50">
                <PackageCheck className="h-3.5 w-3.5" /> {busy ? 'Updating...' : 'Mark as fulfilled'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 flex-wrap p-3 border-b border-[#e3e3e3]">
            <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a8a8a]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders"
                className="sf-input pl-8"
                aria-label="Search orders"
              />
            </form>
            <div className="flex items-center gap-2">
              {statusFilter && (
                <button onClick={() => go({ status: undefined, page: 1 })} className="sf-badge sf-badge-neutral hover:bg-[#e9e9e9]">
                  Status: {statusFilter.replace('_', ' ')} ✕
                </button>
              )}
              <button onClick={exportCsv} className="sf-btn sf-btn-secondary">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? eligibleOrders.map(o => o.id) : [])}
                    className="h-3.5 w-3.5 rounded border-[#c9c9c9]"
                    aria-label="Select all orders on this page"
                  />
                </th>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="text-right">Total</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-14 text-center">
                      <ShoppingBag className="h-8 w-8 text-[#c9c9c9] mx-auto mb-2" />
                      <p className="text-[13px] font-medium text-[#1a1a1a]">No orders found</p>
                      <p className="text-[12px] text-[#8a8a8a] mt-0.5">
                        {search || statusFilter ? 'Try a different search or filter.' : 'Orders will appear here as customers check out.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : orders.map(o => {
                const payment = PAYMENT_BADGE[o.paymentStatus] || { label: o.paymentStatus, cls: 'sf-badge-neutral' }
                const fulfillment = FULFILLMENT_BADGE[o.fulfillmentStatus] || { label: o.fulfillmentStatus || 'Unfulfilled', cls: 'sf-badge-neutral' }
                const itemCount = o.items?.reduce((n, it) => n + it.quantity, 0) || 0
                return (
                  <tr key={o.id} className={cn(selected.includes(o.id) && 'bg-[#f7f9fc]')}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(o.id)}
                        disabled={!canFulfill(o)}
                        title={canFulfill(o) ? undefined : 'Cancelled and refunded orders cannot be fulfilled'}
                        onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter(id => id !== o.id))}
                        className="h-3.5 w-3.5 rounded border-[#c9c9c9] disabled:opacity-30"
                        aria-label={`Select order ${o.orderNumber}`}
                      />
                    </td>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="text-[13px] font-semibold text-[#1a1a1a] hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-[11px] text-[#8a8a8a]">{itemCount} item{itemCount === 1 ? '' : 's'}</p>
                    </td>
                    <td className="text-[12px] text-[#616161] whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      <span className="block text-[11px] text-[#8a8a8a]">
                        {new Date(o.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-full bg-[#eef2f7] text-[#3d4f63] flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {customerName(o)[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] text-[#1a1a1a] truncate">{customerName(o)}</span>
                          <span className="block text-[11px] text-[#8a8a8a] truncate">{o.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="text-right text-[13px] font-medium whitespace-nowrap">{money(o.total, o.currency)}</td>
                    <td><span className={cn('sf-badge', payment.cls)}>{payment.label}</span></td>
                    <td><span className={cn('sf-badge', fulfillment.cls)}>{fulfillment.label}</span></td>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="text-[#8a8a8a] hover:text-[#1a1a1a]" aria-label={`Open order ${o.orderNumber}`}>
                        <Chevron className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-[#e3e3e3] text-[12px] text-[#616161]">
          <span>{total} order{total === 1 ? '' : 's'}</span>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => go({ page: page - 1 })}
                disabled={page <= 1}
                className="p-1.5 rounded-md hover:bg-[#f1f1f1] disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2">Page {page} of {pages}</span>
              <button
                onClick={() => go({ page: page + 1 })}
                disabled={page >= pages}
                className="p-1.5 rounded-md hover:bg-[#f1f1f1] disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
