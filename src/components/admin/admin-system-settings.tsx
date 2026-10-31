'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'
import { Save, Database, RefreshCw, Trash2, Download, Upload, ShieldCheck, Dices } from 'lucide-react'

export function AdminSystemSettings({ settings, smtpConfigured }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    currency: settings.currency || 'USD',
    currency_symbol: settings.currency_symbol || '$',
    require_email_verification: settings.require_email_verification !== 'false' ? 'true' : 'false',
    free_order_dice_enabled: settings.free_order_dice_enabled === 'true' ? 'true' : 'false',
    free_order_dice_sides: settings.free_order_dice_sides || '6',
    free_order_dice_target: settings.free_order_dice_target || '6'
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      toast.success('Settings saved')
      router.refresh()
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const reseed = async () => {
    if (!confirm('Re-seed the database with demo data? This will add demo products if missing but won\'t delete existing data.')) return
    try {
      toast.info('Running seed script...')
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      if (res.ok) {
        toast.success('Seed complete')
        router.refresh()
      } else {
        throw new Error('Seed failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Currency</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Currency</Label>
            <select
              value={form.currency}
              onChange={(e) => {
                const symbols = { USD: '$', EUR: '€', GBP: '£', CAD: '$', AUD: '$', JPY: '¥', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: '$', INR: '₹', CNY: '¥', BRL: 'R$' }
                set('currency', e.target.value)
                set('currency_symbol', symbols[e.target.value] || '$')
              }}
              className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
              <option value="CAD">CAD — Canadian Dollar ($)</option>
              <option value="AUD">AUD — Australian Dollar ($)</option>
              <option value="JPY">JPY — Japanese Yen (¥)</option>
              <option value="CHF">CHF — Swiss Franc</option>
              <option value="SEK">SEK — Swedish Krona</option>
              <option value="NOK">NOK — Norwegian Krone</option>
              <option value="DKK">DKK — Danish Krone</option>
              <option value="NZD">NZD — New Zealand Dollar ($)</option>
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="CNY">CNY — Chinese Yuan (¥)</option>
              <option value="BRL">BRL — Brazilian Real (R$)</option>
            </select>
          </div>
          <div>
            <Label>Symbol</Label>
            <Input value={form.currency_symbol} onChange={(e) => set('currency_symbol', e.target.value)} />
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Security
        </h3>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="font-medium">Require email verification</Label>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              New accounts must click a link in their confirmation email before they can sign in.
              Blocks bots from mass-creating accounts. Unverified accounts can still place guest orders.
            </p>
            {!smtpConfigured && form.require_email_verification === 'true' && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠ SMTP is not configured (Admin → Email &amp; SMTP), so verification links can't be
                delivered — new accounts are verified automatically until SMTP is set up.
              </p>
            )}
          </div>
          <Switch
            checked={form.require_email_verification === 'true'}
            onCheckedChange={(v) => set('require_email_verification', v ? 'true' : 'false')}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Dices className="h-4 w-4" /> Free Order Dice
        </h3>
        <p className="text-sm text-muted-foreground max-w-xl">
          After paying, customers can roll a dice on the order confirmation page. If they roll your
          winning number, you automatically issue them a coupon worth the order total — so the order is
          effectively free for them, but the money stays settled with your payment provider.
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="font-medium">Enable Free Order Dice</Label>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Shows the dice game on the order success page for paid orders.
            </p>
          </div>
          <Switch
            checked={form.free_order_dice_enabled === 'true'}
            onCheckedChange={(v) => set('free_order_dice_enabled', v ? 'true' : 'false')}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Dice sides</Label>
            <Input
              type="number" min="2" max="100"
              value={form.free_order_dice_sides}
              onChange={(e) => set('free_order_dice_sides', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">e.g. 6 for a classic dice</p>
          </div>
          <div>
            <Label>Winning number</Label>
            <Input
              type="number" min="1" max="100"
              value={form.free_order_dice_target}
              onChange={(e) => set('free_order_dice_target', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Roll this number to win. Win chance = 1 in {Math.max(2, parseInt(form.free_order_dice_sides) || 6)}
              {parseInt(form.free_order_dice_target) > (parseInt(form.free_order_dice_sides) || 6) && (
                <span className="text-amber-600"> — clamped to {Math.max(2, parseInt(form.free_order_dice_sides) || 6)} (above max)</span>
              )}
            </p>
          </div>
        </div>
        <div className="p-3 rounded-md bg-muted/60 border border-border text-xs text-muted-foreground">
          <strong className="text-foreground">How winning works:</strong> the dice is rolled server-side exactly once per
          paid order, the result is stored with the order (no re-rolls, no client tampering), and winners receive a
          single-use coupon for the order total by email and on screen.{' '}<em>Doesn&apos;t refund — winners get a
          coupon for the same price.</em>{' '}Coupon codes appear in Admin → Discounts with source “dice”.
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Dice Settings'}
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Database className="h-4 w-4" /> Database Management
        </h3>
        <p className="text-sm text-muted-foreground">Manage demo data and database state.</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={reseed}>
            <RefreshCw className="h-4 w-4 mr-2" /> Re-seed Demo Data
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Environment</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Database</p>
            <p className="font-medium">{process.env.NEXT_PUBLIC_DB_PROVIDER || 'SQLite (local)'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Node env</p>
            <p className="font-medium">{process.env.NODE_ENV}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stripe configured</p>
            <p className="font-medium">{process.env.NEXT_PUBLIC_STRIPE_CONFIGURED === 'true' ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">PayPal configured</p>
            <p className="font-medium">{process.env.NEXT_PUBLIC_PAYPAL_CONFIGURED === 'true' ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
