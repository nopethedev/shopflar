'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Download, Search, Trash2, Mail, Send, Plus, FileUp, Loader2,
  Pencil, PlayCircle, Clock, CircleCheck, CircleX, CircleAlert, PenLine,
  Megaphone, Users, TrendingUp, MoreHorizontal
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { NewsletterEditor } from './newsletter-editor'
import { cn } from '@/lib/utils'

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  draft: { label: 'Draft', icon: PenLine, cls: 'sf-badge-neutral' },
  sending: { label: 'Sending', icon: Clock, cls: 'sf-badge-info' },
  sent: { label: 'Sent', icon: CircleCheck, cls: 'sf-badge-success' },
  partial: { label: 'Partial', icon: CircleAlert, cls: 'sf-badge-warning' },
  failed: { label: 'Failed', icon: CircleX, cls: 'sf-badge-danger' }
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'sending', label: 'Sending' },
  { id: 'sent', label: 'Sent' },
  { id: 'failed', label: 'Failed' }
]

export function AdminNewsletterManager({ subscribers, store }) {
  const router = useRouter()
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [resumingId, setResumingId] = useState(null)
  const [filter, setFilter] = useState('all')

  const activeCount = subscribers.filter(s => s.isActive).length
  const delivered = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0)
  const failed = campaigns.reduce((s, c) => s + (c.failedCount || 0), 0)
  const sentCampaigns = campaigns.filter(c => c.status === 'sent').length

  const loadCampaigns = async () => {
    try {
      const r = await fetch('/api/admin/newsletter/campaigns')
      const d = await r.json()
      if (r.ok) setCampaigns(d.campaigns || [])
    } finally {
      setCampaignsLoading(false)
    }
  }
  useEffect(() => { loadCampaigns() }, [])

  const editCampaign = async (id) => {
    const r = await fetch(`/api/admin/newsletter/campaigns/${id}`)
    const d = await r.json()
    if (r.ok) { setEditing(d.campaign); setView('editor') }
    else toast.error('Could not open campaign', d.error)
  }

  const delCampaign = async (id) => {
    if (!confirm('Delete this campaign and its send history?')) return
    const r = await fetch(`/api/admin/newsletter/campaigns/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Campaign deleted'); loadCampaigns() }
  }

  const resume = async (id) => {
    setResumingId(id)
    try {
      const sr = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, { method: 'POST' })
      const sd = await sr.json()
      if (!sr.ok) throw new Error(sd.error || 'Could not resume')
      let guard = 0
      while (guard++ < 10000) {
        const br = await fetch(`/api/admin/newsletter/campaigns/${id}/batch`, { method: 'POST' })
        const bd = await br.json()
        if (!br.ok) throw new Error(bd.error || 'Batch failed')
        if (bd.done) break
      }
      toast.success('Send resumed and finished')
      loadCampaigns()
    } catch (e) {
      toast.error('Resume failed', e.message, 'Open the campaign to continue with progress.')
    } finally {
      setResumingId(null)
    }
  }

  if (view === 'editor') {
    return (
      <NewsletterEditor
        campaign={editing || {}}
        subscriberCount={activeCount}
        store={store}
        onBack={() => { setEditing(null); setView('list'); loadCampaigns() }}
        onSaved={loadCampaigns}
      />
    )
  }

  const visible = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sf-card p-4">
          <p className="text-[12px] text-[#616161] flex items-center gap-1.5"><Users className="h-3 w-3" /> Subscribers</p>
          <p className="text-[22px] font-semibold mt-1">{subscribers.length}</p>
          <p className="text-[11px] text-[#8a8a8a]">{activeCount} active</p>
        </div>
        <div className="sf-card p-4">
          <p className="text-[12px] text-[#616161] flex items-center gap-1.5"><Megaphone className="h-3 w-3" /> Campaigns sent</p>
          <p className="text-[22px] font-semibold mt-1">{sentCampaigns}</p>
          <p className="text-[11px] text-[#8a8a8a]">{campaigns.length} total</p>
        </div>
        <div className="sf-card p-4">
          <p className="text-[12px] text-[#616161] flex items-center gap-1.5"><Send className="h-3 w-3" /> Emails delivered</p>
          <p className="text-[22px] font-semibold mt-1">{delivered}</p>
          <p className="text-[11px] text-[#8a8a8a]">{failed} failed</p>
        </div>
        <div className="sf-card p-4">
          <p className="text-[12px] text-[#616161] flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Delivery rate</p>
          <p className="text-[22px] font-semibold mt-1">
            {delivered + failed > 0 ? `${Math.round((delivered / (delivered + failed)) * 100)}%` : '—'}
          </p>
          <p className="text-[11px] text-[#8a8a8a]">Across all campaigns</p>
        </div>
      </div>

      <Tabs defaultValue="campaigns">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="bg-white border border-[#e3e3e3]">
            <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers ({subscribers.length})</TabsTrigger>
          </TabsList>
          <Button onClick={() => { setEditing({}); setView('editor') }} className="bg-[#1a1a1a] hover:bg-[#303030]">
            <Plus className="h-4 w-4 mr-1.5" /> Create campaign
          </Button>
        </div>

        <TabsContent value="campaigns" className="mt-4 space-y-3">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map(f => {
              const count = f.id === 'all' ? campaigns.length : campaigns.filter(c => c.status === f.id).length
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'h-7 px-2.5 rounded-lg text-[12px] font-medium border',
                    filter === f.id ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white border-[#d9d9d9] text-[#303030] hover:bg-[#fafafa]'
                  )}
                >
                  {f.label} <span className="opacity-60">({count})</span>
                </button>
              )
            })}
          </div>

          {campaignsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Create a newsletter with the visual editor — text, images and buttons — or send one full-width image that links to your store.
              </p>
              <Button className="mt-5 bg-[#1a1a1a] hover:bg-[#303030]" onClick={() => { setEditing({}); setView('editor') }}>
                <Plus className="h-4 w-4 mr-1.5" /> Create your first campaign
              </Button>
            </Card>
          ) : visible.length === 0 ? (
            <div className="sf-card p-10 text-center text-[13px] text-[#616161]">No campaigns in this state.</div>
          ) : (
            <div className="sf-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th className="text-right">Recipients</th>
                      <th className="text-right">Delivered</th>
                      <th className="text-right">Failed</th>
                      <th>Date</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(c => {
                      const meta = STATUS_META[c.status] || STATUS_META.draft
                      const Icon = meta.icon
                      const needsAttention = c.status === 'sending' && c.pendingCount > 0
                      return (
                        <tr key={c.id}>
                          <td className="max-w-[320px]">
                            <button onClick={() => editCampaign(c.id)} className="text-left group">
                              <span className="block text-[13px] font-medium text-[#1a1a1a] group-hover:underline truncate">{c.subject || 'Untitled campaign'}</span>
                              <span className="block text-[11px] text-[#8a8a8a] truncate">{c.preheader || 'No preview text'}</span>
                            </button>
                          </td>
                          <td>
                            <span className={cn('sf-badge gap-1', meta.cls)}><Icon className="h-3 w-3" /> {meta.label}</span>
                          </td>
                          <td className="text-right text-[12px]">{c.totalRecipients || 0}</td>
                          <td className="text-right text-[12px]">{c.sentCount || 0}</td>
                          <td className="text-right text-[12px]">{c.failedCount || 0}</td>
                          <td className="text-[12px] text-[#616161] whitespace-nowrap">
                            {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              {needsAttention && (
                                <button onClick={() => resume(c.id)} disabled={resumingId === c.id} className="sf-btn sf-btn-secondary h-7 px-2 text-[11px]" title="Resume send">
                                  {resumingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />} Resume
                                </button>
                              )}
                              <button onClick={() => editCampaign(c.id)} className="p-1.5 rounded-md hover:bg-[#f1f1f1] text-[#616161]" title="Open campaign">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => delCampaign(c.id)} className="p-1.5 rounded-md hover:bg-[#f1f1f1] text-[#616161] hover:text-[#8e1f16]" title="Delete campaign">
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
              {visible.some(c => c.totalRecipients > 0) && (
                <div className="p-3 border-t border-[#e3e3e3] space-y-2">
                  {visible.filter(c => c.status === 'sending').map(c => {
                    const pct = c.totalRecipients ? Math.round(((c.sentCount + c.failedCount) / c.totalRecipients) * 100) : 0
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-[#616161]">
                          <span className="truncate">{c.subject} — sending</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <SubscribersTab subscribers={subscribers} router={router} activeCount={activeCount} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubscribersTab({ subscribers, router, activeCount }) {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newEmails, setNewEmails] = useState('')
  const [adding, setAdding] = useState(false)
  const fileRef = useRef(null)

  const filtered = subscribers.filter(s =>
    !search ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const exportCsv = () => {
    const csv = ['email,name,active,source,subscribed_at']
    filtered.forEach(s => {
      csv.push(`${s.email},"${s.name || ''}",${s.isActive},${s.source},"${new Date(s.createdAt).toISOString()}"`)
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported', `${filtered.length} subscribers`)
  }

  const parseEmails = (text) => {
    return [...new Set(
      String(text || '')
        .split(/[\n,;\t]+/)
        .map(x => x.trim().toLowerCase())
        .filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))
    )]
  }

  const addSubscribers = async () => {
    const emails = parseEmails(newEmails)
    if (emails.length === 0) { toast.error('No valid email addresses found'); return }
    setAdding(true)
    try {
      const r = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: emails })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.success('Subscribers added', `${d.added} added, ${d.skipped} already on the list`)
      setNewEmails(''); setAddOpen(false)
      router.refresh()
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setAdding(false)
    }
  }

  const importCsv = async (file) => {
    if (!file) return
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    const emails = parseEmails(lines.join('\n'))
    if (emails.length === 0) { toast.error('No valid emails found in that CSV'); return }
    setAdding(true)
    try {
      const r = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: emails })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.success('Import complete', `${d.added} added, ${d.skipped} skipped`)
      router.refresh()
    } catch (e) {
      toast.error('Import failed', e.message)
    } finally {
      setAdding(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const del = async (id) => {
    if (!confirm('Delete this subscriber?')) return
    const r = await fetch('/api/admin/newsletter', { method: 'DELETE', body: JSON.stringify({ id }) })
    if (r.ok) { toast.success('Deleted'); router.refresh() }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subscribers…" className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => setAddOpen(!addOpen)}><Plus className="h-4 w-4 mr-2" /> Add</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />} Import CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => importCsv(e.target.files?.[0])} />
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>

      {addOpen && (
        <Card className="p-4 space-y-2">
          <Label className="text-xs">Email addresses (one per line, or comma-separated)</Label>
          <textarea
            rows={4}
            value={newEmails}
            onChange={(e) => setNewEmails(e.target.value)}
            placeholder={'customer1@example.com\ncustomer2@example.com'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addSubscribers} disabled={adding || !newEmails.trim()} className="bg-[#1a1a1a] hover:bg-[#303030]">
              {adding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />} Add subscribers
            </Button>
            <p className="text-xs text-muted-foreground">{parseEmails(newEmails).length} valid address(es)</p>
          </div>
        </Card>
      )}

      <div className="sf-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Source</th>
                <th>Subscribed</th>
                <th>Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Mail className="h-7 w-7 mx-auto mb-2 opacity-40" />
                  No subscribers yet.
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  <td className="font-medium">{s.email}</td>
                  <td className="text-muted-foreground">{s.name || '—'}</td>
                  <td><span className="sf-badge sf-badge-neutral capitalize">{s.source.toLowerCase()}</span></td>
                  <td className="text-muted-foreground text-xs">
                    {new Date(s.createdAt).toLocaleDateString()}
                    {s.unsubscribedAt && <span className="block text-[10px]">unsubscribed {new Date(s.unsubscribedAt).toLocaleDateString()}</span>}
                  </td>
                  <td><span className={cn('sf-badge', s.isActive ? 'sf-badge-success' : 'sf-badge-neutral')}>{s.isActive ? 'Active' : 'Unsubscribed'}</span></td>
                  <td>
                    <button onClick={() => del(s.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{activeCount} of {subscribers.length} subscribers will receive new campaigns.</p>
    </div>
  )
}
