'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Download, Search, Trash2, Mail, Send } from 'lucide-react'
import { toast } from '@/lib/toast'

export function AdminNewsletterManager({ subscribers }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [compose, setCompose] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)

  const filtered = subscribers.filter(s =>
    !search ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const exportCsv = () => {
    const csv = ['email,name,subscribed_at']
    filtered.forEach(s => {
      csv.push(`${s.email},"${s.name || ''}","${new Date(s.createdAt).toISOString()}"`)
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

  const del = async (id) => {
    if (!confirm('Delete this subscriber?')) return
    const r = await fetch('/api/admin/newsletter', { method: 'DELETE', body: JSON.stringify({ id }) })
    if (r.ok) { toast.success('Deleted'); router.refresh() }
  }

  const sendNewsletter = async () => {
    if (!compose.subject || !compose.body) {
      toast.error('Subject and body required')
      return
    }
    if (!confirm(`Send to ${subscribers.length} subscribers?`)) return
    setSending(true)
    try {
      const r = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose)
      })
      const d = await r.json()
      if (r.ok) {
        toast.success('Newsletter sent', `${d.sent} sent, ${d.failed} failed`)
        setCompose({ subject: '', body: '' })
      } else {
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Tabs defaultValue="subscribers">
      <TabsList>
        <TabsTrigger value="subscribers">Subscribers ({subscribers.length})</TabsTrigger>
        <TabsTrigger value="compose" className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" /> Compose Email
        </TabsTrigger>
      </TabsList>

      <TabsContent value="subscribers" className="mt-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subscribers..." className="pl-9" />
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

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
                  <td className="p-3 text-muted-foreground text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="p-3"><Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></td>
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
      </TabsContent>

      <TabsContent value="compose" className="mt-4">
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Compose Newsletter</h3>
            <p className="text-xs text-muted-foreground mt-1">Send an email to all {subscribers.length} active subscribers.</p>
          </div>

          <div>
            <Label>Subject</Label>
            <Input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Check out our new collection!" />
          </div>

          <div>
            <Label>Body (HTML supported)</Label>
            <Textarea
              rows={12}
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              placeholder={`<h2>New arrivals just dropped!</h2>\n<p>Check out our latest collection...</p>\n<p><a href="/products">Shop now</a></p>`}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              HTML is supported. Links should be relative (e.g., <code>/products</code>) or absolute.
            </p>
          </div>

          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700">
            <strong>Note:</strong> Requires SMTP to be configured in <a href="/admin/email" className="underline">Email & SMTP</a> settings.
            Emails are sent one at a time with a small delay to avoid overwhelming your SMTP server.
          </div>

          <Button onClick={sendNewsletter} disabled={sending || subscribers.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : `Send to ${subscribers.length} subscribers`}
          </Button>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
