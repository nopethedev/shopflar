'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Download, Search, Trash2, Mail, Send, Plus, FileUp, Loader2,
  Pencil, PlayCircle, Clock, CircleCheck, CircleX, CircleAlert, PenLine
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { NewsletterEditor } from './newsletter-editor'

const STATUS_META = {
  draft: { label: 'Draft', icon: PenLine, cls: 'bg-muted text-muted-foreground' },
  sending: { label: 'Sending', icon: Clock, cls: 'bg-blue-100 text-blue-700' },
  sent: { label: 'Sent', icon: CircleCheck, cls: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'Partial', icon: CircleAlert, cls: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Failed', icon: CircleX, cls: 'bg-red-100 text-red-700' }
}

export function AdminNewsletterManager({ subscribers, store }) {
  const router = useRouter()
  const [view, setView] = useState('list') // list | editor
  const [editing, setEditing] = useState(null) // campaign object or {} for new
  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [resumingId, setResumingId] = useState(null)

  const activeCount = subscribers.filter(s => s.isActive).length

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

  return (
    <Tabs defaultValue="campaigns">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({subscribers.length})</TabsTrigger>
        </TabsList>
        <Button onClick={() => { setEditing({}); setView('editor') }}>
          <Plus className="h-4 w-4 mr-1.5" /> New campaign
        </Button>
      </div>

      {/* ===== CAMPAIGNS ===== */}
      <TabsContent value="campaigns" className="mt-4">
        {campaignsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Create a beautiful newsletter with the visual editor — text, images and buttons —
              or send a single full-width image that links to your store.
            </p>
            <Button className="mt-5" onClick={() => { setEditing({}); setView('editor') }}>
              <Plus className="h-4 w-4 mr-1.5" /> Create your first campaign
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => <CampaignRow key={c.id} c={c} onEdit={() => editCampaign(c.id)} onDelete={() => delCampaign(c.id)} onResume={() => resume(c.id)} resuming={resumingId === c.id} />)}
          </div>
        )}
      </TabsContent>

      {/* ===== SUBSCRIBERS ===== */}
      <TabsContent value="subscribers" className="mt-4">
        <SubscribersTab subscribers={subscribers} router={router} activeCount={activeCount} />
      </TabsContent>
    </Tabs>
  )

  // Resume an interrupted send without opening the editor
  async function resume(id) {
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
}

function CampaignRow({ c, onEdit, onDelete, onResume, resuming }) {
  const meta = STATUS_META[c.status] || STATUS_META.draft
  const Icon = meta.icon
  const processed = c.sentCount + c.failedCount
  const pct = c.totalRecipients ? Math.round((processed / c.totalRecipients) * 100) : 0
  const needsAttention = (c.status === 'sending' && c.pendingCount > 0)

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{c.subject}</p>
            <Badge className={`${meta.cls} gap-1 text-[10px] hover:${meta.cls}`}><Icon className="h-3 w-3" /> {meta.label}</Badge>
            <Badge variant="outline" className="text-[10px]">{c.mode === 'image' ? 'Full image' : 'Blocks'}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {c.mode === 'image' && c.imageUrl ? c.imageUrl.split('/').pop() + ' · ' : ''}
            {c.preheader || 'No preheader'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {needsAttention && (
            <Button size="sm" variant="outline" onClick={onResume} disabled={resuming}>
              {resuming ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 mr-1.5" />}
              Resume ({c.pendingCount} left)
            </Button>
          )}
          {(c.status === 'draft' || c.status === 'failed' || (c.status === 'partial')) && (
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</Button>
          )}
          <button onClick={onDelete} className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {c.totalRecipients > 0 && (
        <div className="mt-3 space-y-1.5">
          <Progress value={pct} className="h-1.5" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{c.sentCount} sent · {c.failedCount} failed · {c.pendingCount} pending</span>
            <span>{c.status === 'sent' ? `completed ${c.sentAt ? new Date(c.sentAt).toLocaleString() : ''}` : `${pct}%`}</span>
          </div>
        </div>
      )}
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
    // Take the first column (email) and skip the header row if present
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
            <Button size="sm" onClick={addSubscribers} disabled={adding || !newEmails.trim()}>
              {adding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />} Add subscribers
            </Button>
            <p className="text-xs text-muted-foreground">{parseEmails(newEmails).length} valid address(es)</p>
          </div>
        </Card>
      )}

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Source</th>
              <th className="text-left p-3 font-medium">Subscribed</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No subscribers yet.
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.id}>
                <td className="p-3 font-medium">{s.email}</td>
                <td className="p-3 text-muted-foreground">{s.name || '—'}</td>
                <td className="p-3"><Badge variant="outline">{s.source}</Badge></td>
                <td className="p-3 text-muted-foreground text-xs">
                  {new Date(s.createdAt).toLocaleDateString()}
                  {s.unsubscribedAt && <span className="block text-[10px]">unsub {new Date(s.unsubscribedAt).toLocaleDateString()}</span>}
                </td>
                <td className="p-3"><Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Active' : 'Unsubscribed'}</Badge></td>
                <td className="p-3">
                  <button onClick={() => del(s.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{activeCount} of {subscribers.length} subscribers will receive new campaigns.</p>
    </div>
  )
}
