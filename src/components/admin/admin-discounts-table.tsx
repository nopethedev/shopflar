'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Search, Trash2, Percent, ArrowRight } from 'lucide-react'

type Status = 'active' | 'scheduled' | 'expired' | 'inactive'

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'sf-badge-success' },
  scheduled: { label: 'Scheduled', cls: 'sf-badge-info' },
  expired: { label: 'Expired', cls: 'sf-badge-neutral' },
  inactive: { label: 'Inactive', cls: 'sf-badge-warning' }
}

const TABS: { id: 'all' | Status; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'expired', label: 'Expired' }
]

function statusOf(d: any): Status {
  const now = Date.now()
  if (!d.isActive) return 'inactive'
  if (d.startDate && new Date(d.startDate).getTime() > now) return 'scheduled'
  if (d.endDate && new Date(d.endDate).getTime() < now) return 'expired'
  return 'active'
}

const valueLabel = (d: any) =>
  d.type === 'PERCENTAGE' ? `${d.value}% off order`
    : d.type === 'FIXED_AMOUNT' ? `$${d.value} off order`
      : 'Free shipping'

export function AdminDiscountsTable({ discounts }) {
  const router = useRouter()
  const [tab, setTab] = useState<'all' | Status>('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const withStatus = useMemo(() => discounts.map(d => ({ ...d, status: statusOf(d) })), [discounts])

  const counts = useMemo(() => ({
    all: withStatus.length,
    active: withStatus.filter(d => d.status === 'active').length,
    scheduled: withStatus.filter(d => d.status === 'scheduled').length,
    expired: withStatus.filter(d => d.status === 'expired').length
  }), [withStatus])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return withStatus.filter(d => {
      const matchesTab = tab === 'all' || d.status === tab
      const matchesSearch = !q || d.code.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [withStatus, tab, search])

  const toggle = async (id: string, current: boolean) => {
    setBusy(id)
    const r = await fetch(`/api/admin/discounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current })
    })
    if (r.ok) {
      toast.success(!current ? 'Discount activated' : 'Discount paused')
      router.refresh()
    } else {
      toast.error('Could not update discount')
    }
    setBusy(null)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this discount? Customers will no longer be able to use the code.')) return
    const r = await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Discount deleted')
      router.refresh()
    } else {
      toast.error('Could not delete discount')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors',
              tab === t.id
                ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                : 'bg-white text-[#303030] border-[#d9d9d9] hover:bg-[#fafafa]'
            )}
          >
            {t.label}
            <span className={cn('text-[10px] px-1.5 rounded-full', tab === t.id ? 'bg-white/20' : 'bg-[#f1f1f1] text-[#616161]')}>
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="sf-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap p-3 border-b border-[#e3e3e3]">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a8a8a]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discounts"
              className="sf-input pl-8"
              aria-label="Search discounts"
            />
          </div>
          <span className="text-[12px] text-[#616161]">{rows.length} discount{rows.length === 1 ? '' : 's'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Type</th>
                <th className="text-right">Usage</th>
                <th>Eligibility</th>
                <th>Ends</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-14 text-center">
                      <Percent className="h-8 w-8 text-[#c9c9c9] mx-auto mb-2" />
                      <p className="text-[13px] font-medium text-[#1a1a1a]">No discounts found</p>
                      <p className="text-[12px] text-[#8a8a8a] mt-0.5">
                        {search ? 'Try a different code.' : 'Create a code to start promoting your store.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : rows.map(d => {
                const badge = STATUS_BADGE[d.status]
                return (
                  <tr key={d.id}>
                    <td>
                      <code className="font-mono text-[12px] font-semibold bg-[#f1f1f1] px-2 py-1 rounded">{d.code}</code>
                      {d.perCustomerLimit && (
                        <p className="text-[11px] text-[#8a8a8a] mt-0.5">Limit {d.perCustomerLimit}/customer</p>
                      )}
                    </td>
                    <td><span className={cn('sf-badge', badge.cls)}>{badge.label}</span></td>
                    <td className="text-[12px]">{valueLabel(d)}</td>
                    <td className="text-right text-[12px]">
                      {d._count?.usage || 0}{d.usageLimit ? ` / ${d.usageLimit}` : ''}
                    </td>
                    <td className="text-[12px] text-[#616161]">
                      {d.minOrderAmount ? `Min. $${d.minOrderAmount}` : 'All orders'}
                    </td>
                    <td className="text-[12px] text-[#616161]">
                      {d.endDate ? new Date(d.endDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No end date'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggle(d.id, d.isActive)}
                          disabled={busy === d.id}
                          className="text-[11px] font-medium text-[#005bd3] hover:underline disabled:opacity-50"
                        >
                          {d.isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => del(d.id)}
                          className="p-1.5 text-[#8a8a8a] hover:text-rose-600"
                          aria-label={`Delete ${d.code}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {discounts.length === 0 && (
          <div className="px-4 py-3 border-t border-[#e3e3e3]">
            <Link href="/admin/discounts/new" className="inline-flex items-center gap-1 text-[12px] text-[#005bd3] hover:underline">
              Create your first discount <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
