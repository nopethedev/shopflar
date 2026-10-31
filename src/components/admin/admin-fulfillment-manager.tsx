'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { Save, Truck, Package, ExternalLink, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'

export function AdminFulfillmentManager({ settings: initial }) {
  const router = useRouter()
  const [saving, setSaving] = useState(null)
  const [settings, setSettings] = useState(initial)
  const [creds, setCreds] = useState({
    PRINTFUL_API_KEY: '',
    CJ_EMAIL: '',
    CJ_API_KEY: ''
  })

  const saveCreds = async (provider) => {
    setSaving(provider)
    try {
      const payload = {}
      if (provider === 'printful' && creds.PRINTFUL_API_KEY) payload.PRINTFUL_API_KEY = creds.PRINTFUL_API_KEY
      if (provider === 'cj') {
        if (creds.CJ_EMAIL) payload.CJ_EMAIL = creds.CJ_EMAIL
        if (creds.CJ_API_KEY) payload.CJ_API_KEY = creds.CJ_API_KEY
      }
      const r = await fetch('/api/admin/fulfillment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) { toast.success('Saved'); router.refresh() }
      else throw new Error('Failed')
    } catch (e) { toast.error('Failed', e.message) }
    finally { setSaving(null) }
  }

  const toggleProvider = async (provider, enabled) => {
    setSettings(s => ({ ...s, [provider]: { ...s[provider], enabled } }))
    try {
      await fetch('/api/admin/fulfillment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`enabled_${provider}`]: enabled })
      })
      toast.success(enabled ? 'Provider enabled' : 'Provider disabled')
      router.refresh()
    } catch (e) { toast.error('Failed') }
  }

  return (
    <div className="space-y-4">
      {/* Printify (existing integration) */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">PR</div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">Printify <Badge variant="outline">Built-in</Badge></h3>
              <p className="text-xs text-muted-foreground">Print-on-demand — already configured separately</p>
            </div>
          </div>
          {settings.printify.configured ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> Not configured</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Printify is managed from <a href="/admin/printify" className="text-foreground hover:underline">Admin → Printify</a>.
          {settings.printify.configured ? ' Auto-fulfillment is active.' : ' Add PRINTIFY_API_KEY in .env or via Admin → Printify.'}
        </p>
      </Card>

      {/* Printful */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#e97248] flex items-center justify-center text-white font-bold text-xs">PF</div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">Printful <Badge variant="outline">Print-on-demand</Badge></h3>
              <p className="text-xs text-muted-foreground">Print-on-demand apparel, accessories, home goods</p>
            </div>
          </div>
          <Switch
            checked={settings.printful.enabled}
            onCheckedChange={(v) => toggleProvider('printful', v)}
            disabled={!settings.printful.configured}
            aria-label="Enable Printful"
          />
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          <div>
            <Label className="text-xs">API Key <span className="text-muted-foreground">(get from Printful dashboard → Stores → API)</span></Label>
            <Input
              type="password"
              value={creds.PRINTFUL_API_KEY}
              onChange={(e) => setCreds(c => ({ ...c, PRINTFUL_API_KEY: e.target.value }))}
              placeholder={settings.printful.apiKey || 'Enter your Printful API key...'}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => saveCreds('printful')} disabled={saving === 'printful'}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving === 'printful' ? 'Saving...' : 'Save'}
            </Button>
            <a href="https://www.printful.com/dashboard/store" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Get API key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {settings.printful.configured && settings.printful.enabled && (
            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Auto-fulfillment active — orders with Printful-linked products are sent automatically when paid.
            </div>
          )}
        </div>
      </Card>

      {/* CJ Dropshipping */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#0066cc] flex items-center justify-center text-white font-bold text-xs">CJ</div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">CJ Dropshipping <Badge variant="outline">Dropshipping</Badge></h3>
              <p className="text-xs text-muted-foreground">General dropshipping — electronics, home, accessories</p>
            </div>
          </div>
          <Switch
            checked={settings.cj.enabled}
            onCheckedChange={(v) => toggleProvider('cj', v)}
            disabled={!settings.cj.configured}
            aria-label="Enable CJ Dropshipping"
          />
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          <div>
            <Label className="text-xs">CJ Account Email</Label>
            <Input
              type="email"
              value={creds.CJ_EMAIL}
              onChange={(e) => setCreds(c => ({ ...c, CJ_EMAIL: e.target.value }))}
              placeholder={settings.cj.email || 'you@example.com'}
            />
          </div>
          <div>
            <Label className="text-xs">API Key <span className="text-muted-foreground">(get from CJ Dropshipping dashboard → API)</span></Label>
            <Input
              type="password"
              value={creds.CJ_API_KEY}
              onChange={(e) => setCreds(c => ({ ...c, CJ_API_KEY: e.target.value }))}
              placeholder={settings.cj.apiKey || 'Enter your CJ API key...'}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => saveCreds('cj')} disabled={saving === 'cj'}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving === 'cj' ? 'Saving...' : 'Save'}
            </Button>
            <a href="https://app.cjdropshipping.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Get API key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {settings.cj.configured && settings.cj.enabled && (
            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Auto-fulfillment active — orders with CJ-linked products are sent automatically when paid.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 bg-muted/30">
        <h3 className="font-semibold mb-2 flex items-center gap-2"><Truck className="h-4 w-4" /> How auto-fulfillment works</h3>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Connect a fulfillment provider above (Printify, Printful, or CJ)</li>
          <li>Import products from the provider into your store</li>
          <li>Link each variant to the provider's variant ID</li>
          <li>When a customer places an order and pays, the order is automatically sent to the provider</li>
          <li>The provider prints/ships the product directly to your customer</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-2">
          You can connect multiple providers simultaneously. Each product is linked to one provider.
        </p>
      </Card>
    </div>
  )
}
