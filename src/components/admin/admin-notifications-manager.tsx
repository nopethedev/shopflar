'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import {
  Bell, Loader2, Send, Info
} from 'lucide-react'

export function AdminNotificationsManager({ initialEnabled, initialWebhookUrl, initialEvents }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl || '')
  const [catalog, setCatalog] = useState({})
  const [events, setEvents] = useState(initialEvents || [])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    // Load the full event catalog (labels) from the API
    fetch('/api/admin/notifications')
      .then(r => r.json())
      .then(d => { if (d.catalog) setCatalog(d.catalog) })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, webhookUrl, events })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      toast.success('Notification settings saved')
      router.refresh()
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setTesting(true)
    try {
      const r = await fetch('/api/admin/notifications', { method: 'PUT' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Test failed')
      toast.success('Test message sent', 'Check your Discord channel.')
    } catch (e) {
      toast.error('Test failed', e.message)
    } finally {
      setTesting(false)
    }
  }

  const toggleEvent = (key, on) => {
    setEvents(ev => on ? [...ev, key] : ev.filter(k => k !== key))
  }

  const eventList = Object.entries(catalog)

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4" /> Discord webhook
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Paste an Incoming Webhook URL. Create one in Discord:
          <span className="whitespace-nowrap"> Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.</span>
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
            <span className="text-sm font-medium">Enable Discord notifications</span>
          </label>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Webhook URL</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
              className="mt-1.5 font-mono text-xs"
              type="url"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save settings
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={testing || !webhookUrl}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send test message
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            The token is stored in your own database and only used to post to your webhook. Failures are visible in Admin → Logs.
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-1">Events to notify</h3>
        <p className="text-xs text-muted-foreground mb-4">Choose which events are posted to the channel.</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {eventList.map(([key, def]) => (
            <label key={key} className="flex items-center gap-2.5 py-1.5 cursor-pointer rounded-md hover:bg-muted/50 px-2 -mx-2">
              <Checkbox
                checked={events.includes(key)}
                onCheckedChange={(v) => toggleEvent(key, !!v)}
              />
              <span className="text-sm">{def.emoji} {def.label}</span>
              <code className="ml-auto text-[10px] text-muted-foreground">{key}</code>
            </label>
          ))}
        </div>
        {eventList.length === 0 && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
          </p>
        )}
        <div className="mt-4">
          <Button onClick={save} disabled={saving} variant="outline" size="sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Apply event selection
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Events are recorded in <a className="underline hover:text-foreground" href="/admin/logs">Admin → Logs</a> regardless of Discord.</li>
          <li>Notification failures never break your store — checkout and orders continue as normal.</li>
          <li>If a webhook post fails (wrong URL, deleted webhook), it shows up as <code className="bg-muted px-1 rounded">discord.failed</code> in the activity log.</li>
        </ul>
      </Card>
    </div>
  )
}
