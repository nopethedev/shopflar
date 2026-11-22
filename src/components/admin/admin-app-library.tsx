'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SecretInput } from '@/components/ui/secret-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { APP_CATEGORIES } from '@/lib/app-catalog'
import { cn } from '@/lib/utils'
import {
  CreditCard, Wallet, Bitcoin, Coins, QrCode, Shirt, Package, Truck, Receipt, MapPin, Mail, Send, MessageSquare, AtSign,
  BarChart3, Tags, Target, Music2, LineChart, Activity, MessagesSquare, MessageCircle, Phone, Gift, Star, Heart, Cookie,
  Code, Sparkles, Bot, Plug, Settings, Check, Search, ExternalLink, Copy, Loader2, CircleAlert
} from 'lucide-react'

const ICONS: Record<string, any> = {
  CreditCard, Wallet, Bitcoin, Coins, QrCode, Shirt, Package, Truck, Receipt, MapPin, Mail, Send, MessageSquare, AtSign,
  BarChart3, Tags, Target, Music2, LineChart, Activity, MessagesSquare, MessageCircle, Phone, Gift, Star, Heart, Cookie,
  Code, Sparkles, Bot
}

// Where the provider should call back — shown in the dialog so it can be pasted
const WEBHOOK_PATHS: Record<string, string> = {
  'crypto-coinbase': '/api/payments/webhook/coinbase',
  'crypto-nowpayments': '/api/payments/webhook/nowpayments'
}

export function AdminAppLibrary({ apps: initial, baseUrl }: { apps: any[]; baseUrl: string }) {
  const router = useRouter()
  const [apps, setApps] = useState(initial)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return apps.filter(a =>
      (category === 'All' || a.category === category) &&
      (!q || `${a.name} ${a.description} ${a.category}`.toLowerCase().includes(q))
    )
  }, [apps, query, category])

  const patch = (slug: string, next: any) => setApps(list => list.map(a => a.slug === slug ? { ...a, ...next } : a))

  const save = async (slug: string, body: any) => {
    setBusy(slug)
    try {
      const r = await fetch(`/api/admin/apps/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not save')
      patch(slug, d.app)
      router.refresh()
      return d.app
    } catch (e: any) {
      toast.error('Could not save', e.message)
      return null
    } finally {
      setBusy(null)
    }
  }

  const toggle = async (app: any) => {
    // Apps with required settings open the dialog first, so they never go live half-configured
    if (!app.enabled && app.fields?.some((f: any) => f.required) && !app.ready) {
      setEditing(app)
      return
    }
    const saved = await save(app.slug, { enabled: !app.enabled })
    if (saved) toast.success(saved.enabled ? `${app.name} enabled` : `${app.name} disabled`)
  }

  const installedCount = apps.filter(a => a.core || a.enabled).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            name="app-search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps…"
            className="pl-8"
            aria-label="Search apps"
          />
        </div>
        <p className="text-xs text-muted-foreground">{installedCount} of {apps.length} apps active</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['All', ...APP_CATEGORIES].map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors',
              category === c ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted border-border'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map(app => {
          const Icon = ICONS[app.icon] || Plug
          const active = app.core || app.enabled
          return (
            <Card key={app.slug} className="p-5 flex flex-col" data-app={app.slug}>
              <div className="flex items-start justify-between mb-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', app.tint || 'bg-muted text-muted-foreground')}>
                  <Icon className="h-5 w-5" />
                </div>
                {app.core ? (
                  <Badge variant="outline" className="text-[10px]">Built-in</Badge>
                ) : (
                  <Switch
                    checked={app.enabled}
                    disabled={busy === app.slug}
                    onCheckedChange={() => toggle(app)}
                    aria-label={`${app.enabled ? 'Disable' : 'Enable'} ${app.name}`}
                  />
                )}
              </div>
              <h3 className="font-semibold flex flex-wrap items-center gap-1.5">
                {app.name}
                {app.badge && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5">{app.badge}</Badge>}
                {!app.core && app.enabled && app.ready && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Check className="h-3 w-3 mr-0.5" /> On</Badge>}
                {!app.core && app.enabled && !app.ready && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><CircleAlert className="h-3 w-3 mr-0.5" /> Needs setup</Badge>}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{app.description}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-3">{app.category}</p>

              <div className="mt-3 flex gap-2">
                {app.fields?.length > 0 && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(app)}>
                    <Settings className="h-3.5 w-3.5 mr-1.5" /> {app.ready ? 'Settings' : 'Set up'}
                  </Button>
                )}
                {app.configPage && (active || app.core) && (
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={app.configPage}><Settings className="h-3.5 w-3.5 mr-1.5" /> {app.core ? 'Open' : 'Configure'}</Link>
                  </Button>
                )}
                {!app.core && !app.enabled && app.configPage && !app.fields?.length && (
                  <p className="text-[11px] text-muted-foreground self-center">Enable to configure</p>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      {visible.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No apps match “{query}”.</p>}

      {editing && (
        <AppDialog
          app={editing}
          baseUrl={baseUrl}
          saving={busy === editing.slug}
          onClose={() => setEditing(null)}
          onSave={async (config, enable) => {
            const saved = await save(editing.slug, { config, ...(enable !== undefined ? { enabled: enable } : {}) })
            if (saved) {
              toast.success(`${editing.name} saved`)
              setEditing(null)
            }
          }}
        />
      )}
    </div>
  )
}

function AppDialog({ app, baseUrl, saving, onClose, onSave }: any) {
  const [values, setValues] = useState<Record<string, any>>(app.config || {})
  const set = (k: string, v: any) => setValues(prev => ({ ...prev, [k]: v }))
  const webhook = WEBHOOK_PATHS[app.slug] ? `${baseUrl}${WEBHOOK_PATHS[app.slug]}` : null
  const missing = (app.fields || []).filter((f: any) => f.required && !String(values[f.key] ?? '').trim())

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{app.name}</DialogTitle>
          <DialogDescription>{app.description}</DialogDescription>
        </DialogHeader>

        {app.setup?.length > 0 && (
          <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
            {app.setup.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ol>
        )}

        {webhook && (
          <div className="rounded-md border border-border bg-muted/40 p-2.5">
            <p className="text-[11px] font-medium mb-1">Webhook endpoint</p>
            <div className="flex items-center gap-2">
              <code className="text-[11px] break-all flex-1">{webhook}</code>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-background"
                aria-label="Copy webhook URL"
                onClick={() => { navigator.clipboard?.writeText(webhook); toast.success('Copied') }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            {baseUrl.startsWith('http://localhost') && (
              <p className="text-[10px] text-amber-700 mt-1.5">This is a local address — set APP_URL to your public HTTPS domain so providers can reach it.</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {(app.fields || []).map((f: any) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              <div className="mt-1.5">
                {f.type === 'secret' ? (
                  <SecretInput
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder || 'Paste value'}
                    className="font-mono text-xs"
                  />
                ) : f.type === 'textarea' ? (
                  <Textarea
                    rows={4}
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="font-mono text-xs"
                    autoComplete="off"
                  />
                ) : f.type === 'toggle' ? (
                  <Switch checked={!!values[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                ) : f.type === 'select' ? (
                  <select
                    value={values[f.key] ?? f.options?.[0]?.[0]}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm"
                  >
                    {f.options.map(([v, l]: [string, string]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : (
                  <Input
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    name={`app-${app.slug}-${f.key}`}
                  />
                )}
              </div>
              {f.help && <p className="text-[11px] text-muted-foreground mt-1">{f.help}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {app.docsUrl
            ? <a href={app.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">Docs <ExternalLink className="h-3 w-3" /></a>
            : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={saving} onClick={() => onSave(values, missing.length === 0 ? true : undefined)}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {app.enabled ? 'Save' : missing.length === 0 ? 'Save & enable' : 'Save'}
            </Button>
          </div>
        </div>
        {missing.length > 0 && <p className="text-[11px] text-muted-foreground -mt-1">Fill in the required fields to enable this app.</p>}
      </DialogContent>
    </Dialog>
  )
}
