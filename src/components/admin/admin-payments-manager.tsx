'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { CreditCard, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'

export function AdminPaymentsManager({ settings: initialSettings }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)

  const save = async (key, value) => {
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

  return (
    <div className="space-y-4">
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
              save('stripe_enabled', v)
            }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs">Status</Label>
            <div className="mt-1">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> No API keys</Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <p className="mt-1.5">{settings.stripe.testMode ? <Badge variant="outline">Test (sandbox)</Badge> : <Badge>Live</Badge>}</p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Setup instructions:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Create a Stripe account at <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline inline-flex items-center gap-1">dashboard.stripe.com <ExternalLink className="h-3 w-3" /></a></li>
            <li>Add the following env vars to <code className="bg-background px-1 py-0.5 rounded">.env</code>:</li>
          </ol>
          <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">{`STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...`}</pre>
          <p className="mt-2">Set the webhook URL to <code className="bg-background px-1 py-0.5 rounded">/api/payments/webhook</code></p>
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
                <Badge variant="outline">Wallet</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Accept PayPal and PayPal Credit</p>
            </div>
          </div>
          <Switch
            checked={settings.paypal.enabled}
            onCheckedChange={(v) => {
              setSettings({ ...settings, paypal: { ...settings.paypal, enabled: v } })
              save('paypal_enabled', v)
            }}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-xs">Status</Label>
            <div className="mt-1">
              {settings.paypal.clientId ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Configured</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> No API keys</Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <p className="mt-1.5">{settings.paypal.testMode ? <Badge variant="outline">Sandbox</Badge> : <Badge>Live</Badge>}</p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Setup instructions:</p>
          <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">{`PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # or live
PAYPAL_WEBHOOK_ID=...`}</pre>
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
              save('cod_enabled', v)
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Useful for local pickup or as a fallback when no payment provider is configured.</p>
      </Card>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">Security notes:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Secret keys are <strong>never</strong> exposed to the browser</li>
          <li>All payment verifications happen server-side</li>
          <li>Webhook signatures are verified before processing</li>
          <li>Product prices are looked up from the database at checkout — client-sent prices are ignored</li>
        </ul>
      </div>
    </div>
  )
}
