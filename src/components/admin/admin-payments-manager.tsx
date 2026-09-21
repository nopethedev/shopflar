'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { CreditCard, CheckCircle2, AlertTriangle, ExternalLink, Save, Eye, EyeOff } from 'lucide-react'

export function AdminPaymentsManager({ settings: initialSettings }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [creds, setCreds] = useState({
    STRIPE_SECRET_KEY: '',
    STRIPE_PUBLISHABLE_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    PAYPAL_CLIENT_ID: '',
    PAYPAL_CLIENT_SECRET: '',
    PAYPAL_MODE: 'sandbox',
    PAYPAL_IPN_URL: '',
    PAYPAL_EMAIL: ''
  })
  const [showSecrets, setShowSecrets] = useState({
    STRIPE_SECRET_KEY: false,
    STRIPE_WEBHOOK_SECRET: false,
    PAYPAL_CLIENT_SECRET: false
  })
  const [loadingCreds, setLoadingCreds] = useState(true)

  // Load credentials from server
  useEffect(() => {
    fetch('/api/admin/payments/credentials')
      .then(r => r.json())
      .then(d => {
        if (d.credentials) {
          setCreds(prev => ({ ...prev, ...d.credentials }))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCreds(false))
  }, [])

  const saveToggle = async (key, value) => {
    setSaving(true)
    const r = await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    })
    if (r.ok) {
      toast.success('Saved')
      router.refresh()
    } else {
      toast.error('Failed')
    }
    setSaving(false)
  }

  const saveCreds = async (fields) => {
    setSaving(true)
    try {
      const payload = {}
      for (const f of fields) payload[f] = creds[f]
      const r = await fetch('/api/admin/payments/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        toast.success('Credentials saved')
        router.refresh()
      } else {
        const d = await r.json()
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const setCred = (key, value) => setCreds(c => ({ ...c, [key]: value }))
  const toggleSecret = (key) => setShowSecrets(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="space-y-4">
      {/* App URL config card */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <ExternalLink className="h-4 w-4" /> Application URL
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          The public URL where your store is accessible. Used for sitemap, SEO metadata, and absolute links in emails.
        </p>
        <AppUrlEditor />
      </Card>

      {/* Stripe */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#635bff] flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Stripe
                <Badge variant="outline">Card payments</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Accept Visa, Mastercard, Amex, Apple Pay, Google Pay</p>
            </div>
          </div>
          <Switch
            checked={settings.stripe.enabled}
            onCheckedChange={(v) => {
              setSettings({ ...settings, stripe: { ...settings.stripe, enabled: v } })
              saveToggle('stripe_enabled', v)
            }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs">Status</Label>
            <div className="mt-1">
              {settings.stripe.configured ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> API keys required</Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <p className="mt-1.5">{settings.stripe.testMode ? <Badge variant="outline">Test (sandbox)</Badge> : <Badge>Live</Badge>}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Secret Key <span className="text-muted-foreground">(server-only, never exposed to browser)</span></Label>
            <div className="flex gap-2">
              <Input
                type={showSecrets.STRIPE_SECRET_KEY ? 'text' : 'password'}
                value={creds.STRIPE_SECRET_KEY}
                onChange={(e) => setCred('STRIPE_SECRET_KEY', e.target.value)}
                placeholder="sk_test_... or sk_live_..."
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => toggleSecret('STRIPE_SECRET_KEY')}>
                {showSecrets.STRIPE_SECRET_KEY ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Publishable Key <span className="text-muted-foreground">(safe for browser)</span></Label>
            <Input
              type="text"
              value={creds.STRIPE_PUBLISHABLE_KEY}
              onChange={(e) => setCred('STRIPE_PUBLISHABLE_KEY', e.target.value)}
              placeholder="pk_test_... or pk_live_..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Webhook Signing Secret</Label>
            <div className="flex gap-2">
              <Input
                type={showSecrets.STRIPE_WEBHOOK_SECRET ? 'text' : 'password'}
                value={creds.STRIPE_WEBHOOK_SECRET}
                onChange={(e) => setCred('STRIPE_WEBHOOK_SECRET', e.target.value)}
                placeholder="whsec_..."
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => toggleSecret('STRIPE_WEBHOOK_SECRET')}>
                {showSecrets.STRIPE_WEBHOOK_SECRET ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Endpoint: <code>/api/payments/webhook/stripe</code></p>
          </div>
          <Button size="sm" onClick={() => saveCreds(['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'])} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save Stripe Credentials
          </Button>
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Get your keys:</p>
          <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline inline-flex items-center gap-1">
            dashboard.stripe.com/apikeys <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>

      {/* PayPal */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#003087] flex items-center justify-center text-white font-bold text-xs">
              PP
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                PayPal
                <Badge variant="outline">REST API + IPN</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Business & personal accounts supported</p>
            </div>
          </div>
          <Switch
            checked={settings.paypal.enabled}
            onCheckedChange={(v) => {
              setSettings({ ...settings, paypal: { ...settings.paypal, enabled: v } })
              saveToggle('paypal_enabled', v)
            }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs">Status</Label>
            <div className="mt-1">
              {settings.paypal.configured ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> API credentials required</Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <select
                value={creds.PAYPAL_MODE}
                onChange={(e) => setCred('PAYPAL_MODE', e.target.value)}
                className="h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value="sandbox">Sandbox (test)</option>
                <option value="live">Live (production)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Client ID</Label>
            <Input
              type="text"
              value={creds.PAYPAL_CLIENT_ID}
              onChange={(e) => setCred('PAYPAL_CLIENT_ID', e.target.value)}
              placeholder="AYb...your-client-id..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Client Secret <span className="text-muted-foreground">(server-only)</span></Label>
            <div className="flex gap-2">
              <Input
                type={showSecrets.PAYPAL_CLIENT_SECRET ? 'text' : 'password'}
                value={creds.PAYPAL_CLIENT_SECRET}
                onChange={(e) => setCred('PAYPAL_CLIENT_SECRET', e.target.value)}
                placeholder="ELb...your-secret..."
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => toggleSecret('PAYPAL_CLIENT_SECRET')}>
                {showSecrets.PAYPAL_CLIENT_SECRET ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">IPN Notification URL <span className="text-muted-foreground">(optional, for personal accounts)</span></Label>
            <Input
              type="text"
              value={creds.PAYPAL_IPN_URL}
              onChange={(e) => setCred('PAYPAL_IPN_URL', e.target.value)}
              placeholder={`${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/payments/webhook/paypal/ipn`}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set this URL in your PayPal account: Profile → My Selling Tools → Instant Payment Notifications
            </p>
          </div>
          <Button size="sm" onClick={() => saveCreds(['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_MODE', 'PAYPAL_IPN_URL'])} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save PayPal Credentials
          </Button>
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How PayPal works here:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li><strong>REST API</strong>: used for hosted checkout (business accounts). Create a REST app at <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline inline-flex items-center gap-1">developer.paypal.com <ExternalLink className="h-3 w-3" /></a></li>
            <li><strong>IPN</strong>: used for personal/premier accounts that rely on PayPal Standard buttons. Enable in your PayPal profile and paste the URL above.</li>
            <li>Server-side verification is always performed — PayPal status is never trusted from the browser.</li>
          </ul>
        </div>
      </Card>

      {/* PayPal Standard (personal account) */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#0070ba] flex items-center justify-center text-white font-bold text-xs">
              PPS
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                PayPal Standard
                <Badge variant="outline">Personal account</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Just need your PayPal email — no API credentials</p>
            </div>
          </div>
          <Switch
            checked={settings.paypalStandard?.enabled || false}
            onCheckedChange={(v) => {
              setSettings({ ...settings, paypalStandard: { ...settings.paypalStandard, enabled: v } })
              saveToggle('paypal_standard_enabled', v)
            }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs">Status</Label>
            <div className="mt-1">
              {settings.paypalStandard?.configured ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> PayPal email required</Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <p className="mt-1.5">{settings.paypalStandard?.testMode ? <Badge variant="outline">Sandbox</Badge> : <Badge>Live</Badge>}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">PayPal Email <span className="text-muted-foreground">(where customers send payment)</span></Label>
            <Input
              type="email"
              value={creds.PAYPAL_EMAIL}
              onChange={(e) => setCred('PAYPAL_EMAIL', e.target.value)}
              placeholder="you@example.com"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your personal PayPal email. No API credentials needed.
            </p>
          </div>
          <div>
            <Label className="text-xs">IPN Notification URL</Label>
            <Input
              type="text"
              value={creds.PAYPAL_IPN_URL}
              onChange={(e) => setCred('PAYPAL_IPN_URL', e.target.value)}
              placeholder={`${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/payments/webhook/paypal/ipn`}
              className="text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set this URL in your PayPal account: Profile → My Selling Tools → Instant Payment Notifications → Update → Enable
            </p>
          </div>
          <Button size="sm" onClick={() => saveCreds(['PAYPAL_EMAIL', 'PAYPAL_IPN_URL', 'PAYPAL_MODE'])} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save PayPal Standard
          </Button>
        </div>

        <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
          <p className="font-semibold">✓ Simplest PayPal setup</p>
          <p>Just enter your PayPal email above and enable. No REST API app, no client ID, no secret.</p>
          <p>Payments are verified via PayPal IPN (server-side). Mode is shared with the REST API card above.</p>
        </div>
      </Card>

      {/* COD */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Cash on Delivery</h3>
              <p className="text-xs text-muted-foreground">Allow customers to pay when their order arrives</p>
            </div>
          </div>
          <Switch
            checked={settings.cod.enabled}
            onCheckedChange={(v) => {
              setSettings({ ...settings, cod: { enabled: v } })
              saveToggle('cod_enabled', v)
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Useful for local pickup or as a fallback when no payment provider is configured.</p>
      </Card>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">Security notes:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Secret keys are stored in the database, never serialized to client bundles</li>
          <li>All payment verifications happen server-side</li>
          <li>Webhook signatures are verified before processing</li>
          <li>Product prices are looked up from the database at checkout — client-sent prices are ignored</li>
          <li>Credentials entered here override any set in <code>.env</code></li>
        </ul>
      </div>
    </div>
  )
}

// Sub-component for editing the app URL
function AppUrlEditor() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.NEXT_PUBLIC_APP_URL) setUrl(d.settings.NEXT_PUBLIC_APP_URL)
        else if (d.settings?.APP_URL) setUrl(d.settings.APP_URL)
        else if (typeof window !== 'undefined') setUrl(window.location.origin)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      // Save to both env-overriding settings keys
      const r = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NEXT_PUBLIC_APP_URL: url,
          APP_URL: url
        })
      })
      if (r.ok) {
        toast.success('App URL saved', 'Update your .env file to match for production builds')
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-xs text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourdomain.com"
          className="text-sm"
        />
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        This controls the URL used in sitemap.xml, robots.txt, and absolute links.
        The dev server port is controlled separately via the <code>PORT</code> environment variable.
      </p>
    </div>
  )
}
