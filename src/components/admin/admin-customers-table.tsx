'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Download, ChevronLeft, ChevronRight, Users, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

const SEGMENTS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'returning', label: 'Returning' },
  { id: 'loyal', label: 'Loyal' },
  { id: 'at-risk', label: 'At risk' },
  { id: 'subscriber', label: 'Email subscribers' }
]

const SEGMENT_BADGE: Record<string, string> = {
  new: 'sf-badge-info',
  returning: 'sf-badge-neutral',
  loyal: 'sf-badge-success',
  'at-risk': 'sf-badge-warning',
  subscriber: 'sf-badge-neutral'
}

const PER_PAGE = 20

export function AdminCustomersTable({ customers, segment: initialSegment, search: initialSearch, counts }) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [segment, setSegment] = useState(initialSegment)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter(c => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      const matchesSegment = segment === 'all' || c.segments.includes(segment)
      return matchesSearch && matchesSegment
    })
  }, [customers, search, segment])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const allOnPageSelected = rows.length > 0 && rows.every(r => selected.includes(r.id))

  const exportCsv = () => {
    const source = selected.length ? filtered.filter(c => selected.includes(c.id)) : filtered
    const lines = ['name,email,orders,total_spent,last_order,segments']
    source.forEach(c => {
      lines.push(`"${c.name}","${c.email}",${c.orderCount},${c.totalSpent.toFixed(2)},"${c.lastOrderAt ? new Date(c.lastOrderAt).toISOString().slice(0, 10) : ''}","${c.segments.join(' ')}"`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', `${source.length} customer${source.length === 1 ? '' : 's'}`)
  }

  const changeSegment = (id: string) => {
    setSegment(id)
    setPage(1)
    router.replace(`/admin/customers${id === 'all' ? '' : `?segment=${id}`}`, { scroll: false })
  }

  return (
    <div className="space-y-3">
      {/* Segments */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {SEGMENTS.map(s => (
          <button
            key={s.id}
            onClick={() => changeSegment(s.id)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors',
              segment === s.id
                ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                : 'bg-white text-[#303030] border-[#d9d9d9] hover:bg-[#fafafa]'
            )}
          >
            {s.label}
            <span className={cn('text-[10px] px-1.5 rounded-full', segment === s.id ? 'bg-white/20' : 'bg-[#f1f1f1] text-[#616161]')}>
              {counts?.[s.id] ?? 0}
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
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search customers"
              className="sf-input pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <span className="sf-badge sf-badge-info">{selected.length} selected</span>
            )}
            <button onClick={exportCsv} className="sf-btn sf-btn-secondary">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(Array.from(new Set([...selected, ...rows.map(r => r.id)])))
                      else setSelected(selected.filter(id => !rows.some(r => r.id === id)))
                    }}
                    className="h-3.5 w-3.5 rounded border-[#c9c9c9]"
                    aria-label="Select all customers on this page"
                  />
                </th>
                <th>Customer</th>
                <th>Segment</th>
                <th>Location</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Amount spent</th>
                <th>Last order</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-12 text-center">
                      <Users className="h-8 w-8 text-[#c9c9c9] mx-auto mb-2" />
                      <p className="text-[13px] font-medium text-[#1a1a1a]">No customers found</p>
                      <p className="text-[12px] text-[#8a8a8a] mt-0.5">Try another segment or search term.</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map(c => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={(e) => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))}
                      className="h-3.5 w-3.5 rounded border-[#c9c9c9]"
                      aria-label={`Select ${c.email}`}
                    />
                  </td>
                  <td>
                    <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-2.5 group">
                      <span className="h-7 w-7 rounded-full bg-[#eef2f7] text-[#3d4f63] flex items-center justify-center text-[11px] font-semibold shrink-0">
                        {(c.name || c.email)[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-[#1a1a1a] group-hover:underline truncate">{c.name}</span>
                        <span className="block text-[11px] text-[#8a8a8a] truncate">{c.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(c.segments.length ? c.segments.slice(0, 2) : ['customer']).map(s => (
                        <span key={s} className={cn('sf-badge capitalize', SEGMENT_BADGE[s] || 'sf-badge-neutral')}>{s.replace('-', ' ')}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-[12px] text-[#616161]">{c.city ? `${c.city}${c.country ? `, ${c.country}` : ''}` : '—'}</td>
                  <td className="text-[12px] text-right">{c.orderCount}</td>
                  <td className="text-[12px] text-right font-medium">${c.totalSpent.toFixed(2)}</td>
                  <td className="text-[12px] text-[#616161]">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-[#e3e3e3] text-[12px] text-[#616161]">
          <span>
            {filtered.length} customer{filtered.length === 1 ? '' : 's'}
            {selected.length > 0 && ` · ${selected.length} selected`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} className="p-1.5 rounded-md hover:bg-[#f1f1f1] disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">Page {current} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages} className="p-1.5 rounded-md hover:bg-[#f1f1f1] disabled:opacity-40" aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#8a8a8a] flex items-center gap-1.5">
        <Mail className="h-3 w-3" />
        Segments update automatically — new means joined in the last 30 days, at risk means no order for 60+ days.
      </p>
    </div>
  )
}
