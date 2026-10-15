'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { Wrench, Rocket, TrendingUp, AlertTriangle, Save, Lock } from 'lucide-react'
import { FileUpload } from '@/components/shared/file-upload'

export function AdminStoreMode({ settings, storeMode, saleLimit }) {
  const router = useRouter()
  const [saving, setSaving] = useState(null)

  const [maintenance, setMaintenance] = useState({
    maintenance_enabled: settings.maintenance_enabled === 'true',
    maintenance_title: settings.maintenance_title || 'Under Maintenance',
    maintenance_message: settings.maintenance_message || 'We\'ll be back shortly. Thanks for your patience.',
    maintenance_image: settings.maintenance_image || ''
  })

  const [prelaunch, setPrelaunch] = useState({
    prelaunch_enabled: settings.prelaunch_enabled === 'true',
    prelaunch_title: settings.prelaunch_title || 'Something Amazing Is Coming',
    prelaunch_subtitle: settings.prelaunch_subtitle || 'We\'re putting the finishing touches on our store. Be the first to know when we launch.',
    prelaunch_image: settings.prelaunch_image || '',
    prelaunch_launch_date: settings.prelaunch_launch_date || ''
  })

  const [saleLimitForm, setSaleLimitForm] = useState({
    sale_limit_enabled: settings.sale_limit_enabled === 'true',
    sale_limit_amount: settings.sale_limit_amount || '10000',
    sale_limit_warning: settings.sale_limit_warning || '90'
  })

  const setMaintenanceField = (k, v) => setMaintenance(m => ({ ...m, [k]: v }))
  const setPrelaunchField = (k, v) => setPrelaunch(p => ({ ...p, [k]: v }))
  const setSaleLimitField = (k, v) => setSaleLimitForm(s => ({ ...s, [k]: v }))

  const save = async (section) => {
    setSaving(section)
    try {
      const payload = section === 'maintenance'
        ? { ...maintenance, maintenance_enabled: maintenance.maintenance_enabled ? 'true' : 'false' }
        : section === 'prelaunch'
          ? { ...prelaunch, prelaunch_enabled: prelaunch.prelaunch_enabled ? 'true' : 'false' }
          : { ...saleLimitForm, sale_limit_enabled: saleLimitForm.sale_limit_enabled ? 'true' : 'false' }

      const r = await fetch('/api/admin/store-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        toast.success('Saved')
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <Tabs defaultValue={storeMode.mode === 'prelaunch' ? 'prelaunch' : storeMode.mode === 'maintenance' ? 'maintenance' : 'maintenance'}>
      <TabsList>
        <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" /> Maintenance
          {maintenance.maintenance_enabled && <Badge className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-100">On</Badge>}
        </TabsTrigger>
        <TabsTrigger value="prelaunch" className="flex items-center gap-1.5">
          <Rocket className="h-3.5 w-3.5" /> Pre-Launch
          {prelaunch.prelaunch_enabled && <Badge className="ml-1 bg-blue-100 text-blue-700 hover:bg-blue-100">On</Badge>}
        </TabsTrigger>
        <TabsTrigger value="sale-limit" className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Sale Limit
          {saleLimitForm.sale_limit_enabled && <Badge className="ml-1 bg-purple-100 text-purple-700 hover:bg-purple-100">On</Badge>}
        </TabsTrigger>
      </TabsList>

      {/* Maintenance Mode */}
      <TabsContent value="maintenance" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance Mode</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Locks the entire storefront. Visitors see a maintenance page with your message.
                Admin panel stays accessible. A discreet login button appears in the bottom corner.
              </p>
            </div>
            <Switch
              checked={maintenance.maintenance_enabled}
              onCheckedChange={(v) => setMaintenanceField('maintenance_enabled', v)}
              aria-label="Enable maintenance mode"
            />
          </div>

          {maintenance.maintenance_enabled && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div>
                <Label className="text-xs">Page Title</Label>
                <Input value={maintenance.maintenance_title} onChange={(e) => setMaintenanceField('maintenance_title', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea rows={3} value={maintenance.maintenance_message} onChange={(e) => setMaintenanceField('maintenance_message', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Background Image URL (optional)</Label>
                <FileUpload type="image" value={maintenance.maintenance_image} onChange={(url) => setMaintenanceField('maintenance_image', url)} />
              </div>
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>While maintenance mode is on:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>All storefront pages show the maintenance message</li>
                    <li>Admin panel remains accessible at <code>/admin</code></li>
                    <li>A small lock icon appears in the bottom-right corner — click it to reach the login page</li>
                    <li>API routes continue to function (webhooks, etc.)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <Button onClick={() => save('maintenance')} disabled={saving === 'maintenance'}>
            <Save className="h-4 w-4 mr-2" /> {saving === 'maintenance' ? 'Saving...' : 'Save Maintenance Settings'}
          </Button>
        </Card>
      </TabsContent>

      {/* Pre-Launch Mode */}
      <TabsContent value="prelaunch" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Rocket className="h-4 w-4" /> Pre-Launch Countdown</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Shows a countdown timer page until your launch date. Visitors can subscribe to your newsletter.
                The store automatically opens when the timer hits zero (turn off this toggle manually or set it before launch).
              </p>
            </div>
            <Switch
              checked={prelaunch.prelaunch_enabled}
              onCheckedChange={(v) => setPrelaunchField('prelaunch_enabled', v)}
              aria-label="Enable pre-launch mode"
            />
          </div>

          {prelaunch.prelaunch_enabled && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div>
                <Label className="text-xs">Page Title</Label>
                <Input value={prelaunch.prelaunch_title} onChange={(e) => setPrelaunchField('prelaunch_title', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Subtitle</Label>
                <Textarea rows={2} value={prelaunch.prelaunch_subtitle} onChange={(e) => setPrelaunchField('prelaunch_subtitle', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Launch Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  value={prelaunch.prelaunch_launch_date ? new Date(prelaunch.prelaunch_launch_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setPrelaunchField('prelaunch_launch_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
                <p className="text-xs text-muted-foreground mt-1">When the countdown reaches zero, the store will open automatically.</p>
              </div>
              <div>
                <Label className="text-xs">Background Image URL (optional)</Label>
                <FileUpload type="image" value={prelaunch.prelaunch_image} onChange={(url) => setPrelaunchField('prelaunch_image', url)} />
              </div>
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
                <Rocket className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>While pre-launch mode is on:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Visitors see a countdown timer to your launch date</li>
                    <li>Email signup form collects newsletter subscribers</li>
                    <li>Admin panel remains accessible at <code>/admin</code></li>
                    <li>When the timer expires, turn off this toggle to open the store</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <Button onClick={() => save('prelaunch')} disabled={saving === 'prelaunch'}>
            <Save className="h-4 w-4 mr-2" /> {saving === 'prelaunch' ? 'Saving...' : 'Save Pre-Launch Settings'}
          </Button>
        </Card>
      </TabsContent>

      {/* Sale Limit */}
      <TabsContent value="sale-limit" className="mt-4 space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Sale Limit</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Set a maximum total sales amount. Useful if your PayPal account has a receiving limit.
                When you approach the limit, all products are automatically marked as out of stock.
              </p>
            </div>
            <Switch
              checked={saleLimitForm.sale_limit_enabled}
              onCheckedChange={(v) => setSaleLimitField('sale_limit_enabled', v)}
              aria-label="Enable sale limit"
            />
          </div>

          {saleLimitForm.sale_limit_enabled && (
            <div className="space-y-3 pt-3 border-t border-border">
              {/* Current status */}
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Status</span>
                  {saleLimit.exceeded ? (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Limit Exceeded</Badge>
                  ) : saleLimit.warning ? (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Approaching Limit</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">OK</Badge>
                  )}
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold">${saleLimit.total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm text-muted-foreground mb-1">of ${saleLimit.limit.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${saleLimit.exceeded ? 'bg-rose-600' : saleLimit.warning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, saleLimit.percentage)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {saleLimit.remaining > 0
                    ? `$${saleLimit.remaining.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining`
                    : 'Limit reached — all products marked out of stock'}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Sale Limit Amount ($)</Label>
                  <Input type="number" step="0.01" value={saleLimitForm.sale_limit_amount} onChange={(e) => setSaleLimitField('sale_limit_amount', e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Maximum total revenue from paid orders</p>
                </div>
                <div>
                  <Label className="text-xs">Warning Threshold (%)</Label>
                  <Input type="number" min="50" max="100" value={saleLimitForm.sale_limit_warning} onChange={(e) => setSaleLimitField('sale_limit_warning', e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">When total sales reach this % of the limit, all products go out of stock</p>
                </div>
              </div>

              {saleLimit.warning && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Approaching sale limit!</strong> All products have been marked as out of stock.
                    Customers cannot place new orders until you raise the limit or disable it.
                    Existing orders are unaffected.
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={() => save('sale-limit')} disabled={saving === 'sale-limit'}>
            <Save className="h-4 w-4 mr-2" /> {saving === 'sale-limit' ? 'Saving...' : 'Save Sale Limit'}
          </Button>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
