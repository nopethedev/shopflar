'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { Copy, Check, KeyRound, Trash2, ShieldAlert, Loader2, Plug } from 'lucide-react'

function CodeBlock({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative rounded-md bg-zinc-950 text-zinc-100">
      {label && <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>}
      <pre className="px-3 py-2.5 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">{children}</pre>
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="absolute top-2 right-2 p-1.5 rounded hover:bg-white/10 text-zinc-300"
        aria-label="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

export function AdminMcpManager({ enabled: initialEnabled, initialKeys, endpoint, tools }: any) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [keys, setKeys] = useState<any[]>(initialKeys)
  const [name, setName] = useState('Claude')
  const [scope, setScope] = useState<'read' | 'write'>('write')
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)

  const toggle = async (v: boolean) => {
    setEnabled(v)
    const r = await fetch('/api/admin/apps/mcp-server', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: v }) })
    if (!r.ok) { setEnabled(!v); toast.error('Could not update the MCP server') } else toast.success(v ? 'MCP server enabled' : 'MCP server disabled')
  }

  const create = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/mcp/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scope }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setNewKey(d.key)
      const list = await fetch('/api/admin/mcp/keys').then(x => x.json())
      setKeys(list.keys || [])
      if (!enabled) await toggle(true)
    } catch (e: any) {
      toast.error('Could not create key', e.message)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this key? Anything using it stops working immediately.')) return
    const r = await fetch(`/api/admin/mcp/keys/${id}`, { method: 'DELETE' })
    if (r.ok) setKeys(k => k.map(x => x.id === id ? { ...x, revokedAt: new Date().toISOString() } : x))
    else toast.error('Could not revoke key')
  }

  const keyPlaceholder = newKey || 'sfk_YOUR_KEY'

  return (
    <div className="space-y-5">
      <Card className="p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><Plug className="h-4 w-4" /> MCP endpoint {enabled ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">On</Badge> : <Badge variant="outline">Off</Badge>}</h2>
          <code className="text-xs text-muted-foreground break-all">{endpoint}</code>
          {endpoint.startsWith('http://localhost') && <p className="text-[11px] text-amber-700 mt-1">Claude can only reach this from your own machine. Set APP_URL to your public HTTPS domain for remote use.</p>}
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} aria-label="Enable MCP server" />
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> API keys</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} autoComplete="off" name="mcp-key-name" placeholder="Claude on my laptop" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block">Access</label>
            <select value={scope} onChange={e => setScope(e.target.value as any)} className="h-9 px-2 rounded-md border border-input bg-background text-sm">
              <option value="write">Read & write</option>
              <option value="read">Read only</option>
            </select>
          </div>
          <Button onClick={create} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Create key</Button>
        </div>

        {newKey && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-medium text-amber-900 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Copy this key now — it is shown only once.</p>
            <CodeBlock>{newKey}</CodeBlock>
          </div>
        )}

        {keys.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {keys.map(k => (
              <li key={k.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{k.name} <span className="font-mono text-xs text-muted-foreground">{k.prefix}…</span></p>
                  <p className="text-[11px] text-muted-foreground">
                    {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'Never used'} · created {new Date(k.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{k.scope === 'write' ? 'read & write' : 'read only'}</Badge>
                {k.revokedAt
                  ? <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Revoked</Badge>
                  : <button onClick={() => revoke(k.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Revoke key"><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">No keys yet.</p>}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Connect Claude</h2>
        <div className="space-y-2">
          <p className="text-sm font-medium">Claude Code</p>
          <CodeBlock>{`claude mcp add --transport http shopflar ${endpoint} \\\n  --header "Authorization: Bearer ${keyPlaceholder}"`}</CodeBlock>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Claude Desktop <span className="text-muted-foreground font-normal">— add to <code>claude_desktop_config.json</code> (needs Node.js)</span></p>
          <CodeBlock>{JSON.stringify({ mcpServers: { shopflar: { command: 'npx', args: ['-y', 'mcp-remote', endpoint, '--header', `Authorization: Bearer ${keyPlaceholder}`] } } }, null, 2)}</CodeBlock>
        </div>
        <p className="text-xs text-muted-foreground">Then try: <em>“Create three draft products for a summer sock collection with prices, then make a 15% discount code SUMMER15 that ends on August 31.”</em></p>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">What Claude can do <span className="text-xs font-normal text-muted-foreground">({tools.length} tools)</span></h2>
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Safe by design.</strong> Products and campaigns are created as drafts, products are archived rather than deleted, theme changes stay drafts until published, and nothing can send email or move money.</p>
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {tools.map((t: any) => (
            <li key={t.name} className="text-xs">
              <code className="font-mono font-medium">{t.name}</code>{' '}
              <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">{t.write ? 'write' : 'read'}</Badge>
              <p className="text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
