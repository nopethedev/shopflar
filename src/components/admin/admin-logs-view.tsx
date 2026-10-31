'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Activity, Mail, RefreshCw, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, Search, Trash2, AlertTriangle
} from 'lucide-react'
import { toast } from '@/lib/toast'

const PER_PAGE = 25

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Badge styling per action family
function actionBadge(action) {
  if (action.startsWith('order.placed')) return { label: action, cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' }
  if (action.startsWith('order.paid')) return { label: action, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' }
  if (action.startsWith('order.refunded')) return { label: action, cls: 'bg-red-500/10 text-red-600 border-red-500/30' }
  if (action.startsWith('order.')) return { label: action, cls: 'bg-violet-500/10 text-violet-600 border-violet-500/30' }
  if (action.startsWith('stock.')) return { label: action, cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30' }
  if (action.startsWith('email.')) return { label: action, cls: 'bg-red-500/10 text-red-600 border-red-500/30' }
  if (action.startsWith('discord.')) return { label: action, cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' }
  if (action.startsWith('dice.')) return { label: action, cls: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' }
  if (action.startsWith('user.')) return { label: action, cls: 'bg-sky-500/10 text-sky-600 border-sky-500/30' }
  if (action.startsWith('settings.')) return { label: action, cls: 'bg-neutral-500/10 text-neutral-600 border-neutral-500/30' }
  return { label: action, cls: 'bg-muted text-muted-foreground border-border' }
}

// Human label for known actions
const ACTION_LABELS = {
  'order.placed': 'Order placed',
  'order.paid': 'Payment received',
  'order.status_changed': 'Order status changed',
  'order.refunded': 'Order refunded',
  'order.fulfilled': 'Auto-fulfilled',
  'order.updated': 'Order updated',
  'order.deleted': 'Order deleted',
  'stock.low': 'Stock running low',
  'email.failed': 'Email failed',
  'discord.failed': 'Discord webhook failed',
  'discord.test': 'Discord test sent',
  'dice.won': 'Dice game won',
  'user.registered': 'Customer registered',
  'user.verified': 'Email verified',
  'settings.updated': 'Settings changed',
  'product.created': 'Product created',
  'product.updated': 'Product updated',
  'product.deleted': 'Product deleted',
  'discount.created': 'Discount created',
  'discount.updated': 'Discount updated',
  'discount.deleted': 'Discount deleted',
  'user.updated': 'User updated',
  'user.deleted': 'User deleted'
}

function parseMeta(raw) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return { value: raw } }
}

export function AdminLogsView() {
  const [tab, setTab] = useState('activity') // activity | emails
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null) // expanded row id
  const [emailBody, setEmailBody] = useState(null) // {id, body}
  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRef = useRef(null)

  const load = useCallback(async (opts = {}) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ type: opts.tab || tab, page: String(opts.page || page) })
      const query = 'q' in opts ? opts.q : q
      if (query) p.set('q', query)
      const status = 'status' in opts ? opts.status : statusFilter
      if (status) p.set('status', status)
      const r = await fetch(`/api/admin/logs?${p}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load')
      setRows(d.rows || [])
      setTotal(d.total || 0)
    } catch (e) {
      toast.error('Could not load logs', e.message)
    } finally {
      setLoading(false)
    }
  }, [tab, page, q, statusFilter])

  useEffect(() => { load({ tab, page }) }, [tab, page, q, statusFilter])

  // Optional auto-refresh (15s) — handy while watching a test order come in
  useEffect(() => {
    clearInterval(autoRef.current)
    if (autoRefresh) {
      autoRef.current = setInterval(() => load(), 15000)
    }
    return () => clearInterval(autoRef.current)
  }, [autoRefresh, load])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const openEmail = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    setEmailBody(null)
    try {
      const r = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: id })
      })
      const d = await r.json()
      if (r.ok) setEmailBody(d.email?.body || '(empty)')
      else setEmailBody(`(could not load body: ${d.error})`)
    } catch {
      setEmailBody('(could not load body)')
    }
  }

  const clearLogs = async () => {
    const days = confirm(
      'Clear logs?\n\nOK = delete ALL entries of the current tab\nCancel = keep everything'
    )
    if (!days) return
    try {
      const r = await fetch(`/api/admin/logs?type=${tab}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.success('Logs cleared', `${d.deleted} entries deleted`)
      setPage(1)
      load({ page: 1 })
    } catch (e) {
      toast.error('Failed to clear', e.message)
    }
  }

  const search = (e) => {
    e.preventDefault()
    setQ(qInput)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Tabs + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${tab === 'activity' ? 'bg-foreground text-background' : 'bg-background hover:bg-muted'}`}
            onClick={() => { setTab('activity'); setPage(1); setExpanded(null) }}
          >
            <Activity className="h-4 w-4" /> Activity
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-l border-border ${tab === 'emails' ? 'bg-foreground text-background' : 'bg-background hover:bg-muted'}`}
            onClick={() => { setTab('emails'); setPage(1); setExpanded(null) }}
          >
            <Mail className="h-4 w-4" /> Emails
          </button>
        </div>

        <form onSubmit={search} className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-sm">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={tab === 'activity' ? 'Search action, email, entity…' : 'Search recipient, subject…'}
            className="h-9 text-sm"
          />
          <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {tab === 'emails' && (
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-foreground" />
            Auto-refresh 15s
          </label>
          <Button variant="ghost" size="sm" onClick={() => load()}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button variant="ghost" size="sm" onClick={clearLogs} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
        </div>
      </div>

      {/* List */}
      <Card className="divide-y divide-border overflow-hidden">
        {loading && rows.length === 0 && (
          <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">
            {tab === 'activity' ? 'No activity yet — it fills up as orders, changes and events happen.' : 'No emails logged yet.'}
          </div>
        )}

        {tab === 'activity' && rows.map((row) => {
          const badge = actionBadge(row.action)
          const meta = parseMeta(row.metadata)
          const isOpen = expanded === row.id
          return (
            <div key={row.id}>
              <button
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3"
                onClick={() => setExpanded(isOpen ? null : row.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-[11px] font-medium ${badge.cls}`}>
                      {ACTION_LABELS[row.action] || row.action}
                    </Badge>
                    <code className="text-[10px] text-muted-foreground">{row.action}</code>
                  </div>
                  <p className="text-sm mt-1 truncate">
                    {row.actorEmail
                      ? <span className="text-muted-foreground">{row.actorEmail} · </span>
                      : null}
                    {meta ? Object.entries(meta).slice(0, 3).map(([k, v]) => (
                      typeof v !== 'object' && v != null ? <span key={k} className="mr-3"><span className="text-muted-foreground">{k}:</span> {String(v).slice(0, 60)}</span> : null
                    )) : row.entity ? <span className="text-muted-foreground">{row.entity}</span> : null}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{fmtTime(row.createdAt)}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  {meta && Object.keys(meta).length > 0 ? (
                    <pre className="rounded-md bg-muted p-3 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(meta, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No extra details recorded.</p>
                  )}
                  {row.entityId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {row.entity}: <code className="bg-muted px-1 rounded">{row.entityId}</code>
                      {row.actorId && <> · by <code className="bg-muted px-1 rounded">{row.actorId.slice(-6)}</code></>}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {tab === 'emails' && rows.map((row) => {
          const isOpen = expanded === row.id
          const failed = row.status === 'failed'
          return (
            <div key={row.id}>
              <button
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3"
                onClick={() => openEmail(row.id)}
              >
                {failed
                  ? <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                  : <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{row.subject || '(no subject)'}</p>
                  <p className="text-xs text-muted-foreground truncate">to {row.to}</p>
                  {failed && row.error && (
                    <p className="text-xs text-destructive mt-1 flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{row.error}</span>
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{fmtTime(row.createdAt)}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  {failed && row.error && (
                    <div className="mb-2 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                      {row.error}
                    </div>
                  )}
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Email body</p>
                  {emailBody === null
                    ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    : (
                      <iframe
                        title={`email-${row.id}`}
                        srcDoc={emailBody}
                        sandbox=""
                        className="w-full h-64 rounded-md border border-border bg-white"
                      />
                    )}
                </div>
              )}
            </div>
          )
        })}
      </Card>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {total} entries · page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
