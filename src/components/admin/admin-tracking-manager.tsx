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
import { toast } from '@/lib/toast'
import { Save, BarChart, Facebook, AlertTriangle, Shield } from 'lucide-react'

const TRACKERS = [
  {
    key: 'ga4',
    name: 'Google Analytics 4',
    icon: BarChart,
    description: 'Anonymous page view tracking. Requires consent (analytics category).',
    fields: [{ key: 'tracking_ga4_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' }]
  },
  {
    key: 'meta_pixel',
    name: 'Meta (Facebook) Pixel',
    icon: Facebook,
    description: 'Conversion tracking for Facebook/Instagram ads. Requires consent (marketing category).',
    fields: [{ key: 'tracking_meta_pixel_id', label: 'Pixel ID', placeholder: '123456789012345' }]
  },
  {
    key: 'gtm',
    name: 'Google Tag Manager',
    icon: Shield,
    description: 'Container for managing multiple tags. Recommended if you use many trackers.',
    fields: [{ key: 'tracking_gtm_id', label: 'Container ID', placeholder: 'GTM-XXXXXXX' }]
  }
]

export function AdminTrackingManager({ settings: initialSettings }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(initialSettings)
  const [enabledTrackers, setEnabledTrackers] = useState(() => {
    const enabled = {}
    for (const t of TRACKERS) {
      const id = settings[`tracking_${t.key}_id`]
      enabled[t.key] = !!id
    }
    return enabled
  })

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }))

  const save = async (tracker) => {
    setSaving(true)
    try {
      const payload = {}
      for (const f of tracker.fields) {
        payload[f.key] = enabledTrackers[tracker.key] ? settings[f.key] || '' : ''
      }
      const r = await fetch('/api/admin/tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        toast.success('Saved', `${tracker.name} ${enabledTrackers[tracker.key] ? 'enabled' : 'disabled'}`)
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {TRACKERS.map(t => (
        <Card key={t.key} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <t.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {t.name}
                  {settings[`tracking_${t.key}_id`] && (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
            </div>
            <Switch
              checked={enabledTrackers[t.key]}
              onCheckedChange={(v) => setEnabledTrackers(s => ({ ...s, [t.key]: v }))}
              aria-label={`Enable ${t.name}`}
            />
          </div>

          {enabledTrackers[t.key] && (
            <div className="space-y-3 pt-3 border-t border-border">
              {t.fields.map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    value={settings[f.key] || ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
              <Button size="sm" onClick={() => save(t)} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          )}
        </Card>
      ))}

      <Card className="p-5 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-2">
            <p className="font-semibold">Compliance reminder</p>
            <p>
              Tracking scripts only load for visitors who have given consent via the cookie banner.
              Make sure your privacy policy discloses which trackers you use and why.
              See <a href="/privacy" target="_blank" className="underline">Privacy Policy</a> and <a href="/cookies" target="_blank" className="underline">Cookie Policy</a>.
            </p>
            <p>
              <strong>Third-party embeds:</strong> Product images are loaded from Unsplash (no tracking).
              Payment providers (Stripe, PayPal) may set their own cookies during checkout — see their policies.
              No other third-party scripts are embedded by default.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
