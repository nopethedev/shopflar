'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { Save, Mail, Send, Settings, Gift, Bell } from 'lucide-react'

export function AdminEmailConfig({ settings, welcome, configured }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [smtp, setSmtp] = useState({
    smtp_host: settings.smtp_host || '',
    smtp_port: settings.smtp_port || '587',
    smtp_user: settings.smtp_user || '',
    smtp_pass: settings.smtp_pass || '',
    smtp_from_email: settings.smtp_from_email || '',
    smtp_from_name: settings.smtp_from_name || '',
    // Security mode: 'none' | 'ssl' | 'tls'
    // Backward compat: if old smtp_secure was 'true', default to 'ssl', otherwise 'tls'
    smtp_security: settings.smtp_security || (settings.smtp_secure === 'true' ? 'ssl' : 'tls')
  })
  const [welcomeConfig, setWelcomeConfig] = useState({
    newsletter_welcome_enabled: welcome.newsletter_welcome_enabled === 'true',
    newsletter_welcome_discount_percent: welcome.newsletter_welcome_discount_percent || '10',
    newsletter_welcome_code_prefix: welcome.newsletter_welcome_code_prefix || 'WELCOME',
    newsletter_prompt_title: welcome.newsletter_prompt_title || 'Get 10% off your first order',
    newsletter_prompt_subtitle: welcome.newsletter_prompt_subtitle || 'Subscribe to our newsletter for early access to new drops and exclusive offers.'
  })

  const setSmtpField = (k, v) => setSmtp(s => ({ ...s, [k]: v }))
  const setWelcomeField = (k, v) => setWelcomeConfig(w => ({ ...w, [k]: v }))

  const saveSmtp = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtp)
      })
      if (r.ok) { toast.success('Saved', 'SMTP settings updated'); router.refresh() }
      else throw new Error('Failed')
    } catch (e) { toast.error('Failed', e.message) }
    finally { setSaving(false) }
  }

  const saveWelcome = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...welcomeConfig,
          newsletter_welcome_enabled: welcomeConfig.newsletter_welcome_enabled ? 'true' : 'false'
        })
      })
      if (r.ok) { toast.success('Saved', 'Newsletter welcome settings updated'); router.refresh() }
      else throw new Error('Failed')
    } catch (e) { toast.error('Failed', e.message) }
    finally { setSaving(false) }
  }

  const sendTest = async () => {
    if (!testEmail) { toast.error('Enter a test email address'); return }
    setTesting(true)
    try {
      const r = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      })
      const d = await r.json()
      if (r.ok && d.success) toast.success('Test email sent!', `Check ${testEmail}`)
      else toast.error('Test failed', d.error || 'Check SMTP settings')
    } catch (e) { toast.error('Failed', e.message) }
    finally { setTesting(false) }
  }

  return (
    <Tabs defaultValue="smtp">
      <TabsList>
        <TabsTrigger value="smtp" className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> SMTP Server</TabsTrigger>
        <TabsTrigger value="welcome" className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Welcome Email</TabsTrigger>
        <TabsTrigger value="prompt" className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Subscribe Prompt</TabsTrigger>
      </TabsList>

      {/* SMTP CONFIG */}
      <TabsContent value="smtp" className="mt-4 space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> SMTP Configuration</h3>
            {configured ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Configured</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Not configured</Badge>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">SMTP Host</Label>
              <Input value={smtp.smtp_host} onChange={(e) => setSmtpField('smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label className="text-xs">Port</Label>
              <Input value={smtp.smtp_port} onChange={(e) => setSmtpField('smtp_port', e.target.value)} placeholder="587" />
            </div>
            <div>
              <Label className="text-xs">Security</Label>
              <select
                value={smtp.smtp_security}
                onChange={(e) => setSmtpField('smtp_security', e.target.value)}
                className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="tls">TLS (STARTTLS — port 587, recommended)</option>
                <option value="ssl">SSL (implicit TLS — port 465)</option>
                <option value="none">None (plain — port 25, not recommended)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {smtp.smtp_security === 'tls' && 'Connection starts plain, then upgrades to TLS. Use port 587. Most providers support this.'}
                {smtp.smtp_security === 'ssl' && 'Connection is encrypted from the start. Use port 465.'}
                {smtp.smtp_security === 'none' && '⚠️ Plain connection with no encryption. Only use for local dev or trusted networks.'}
              </p>
            </div>
            <div>
              <Label className="text-xs">Username</Label>
              <Input value={smtp.smtp_user} onChange={(e) => setSmtpField('smtp_user', e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input type="password" value={smtp.smtp_pass} onChange={(e) => setSmtpField('smtp_pass', e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label className="text-xs">From Email</Label>
              <Input value={smtp.smtp_from_email} onChange={(e) => setSmtpField('smtp_from_email', e.target.value)} placeholder="orders@yourstore.com" />
            </div>
            <div>
              <Label className="text-xs">From Name</Label>
              <Input value={smtp.smtp_from_name} onChange={(e) => setSmtpField('smtp_from_name', e.target.value)} placeholder="Your Store" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button onClick={saveSmtp} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save SMTP'}
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Send Test Email</h3>
          <p className="text-xs text-muted-foreground">Verify your SMTP settings work by sending a test email.</p>
          <div className="flex gap-2">
            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
            <Button onClick={sendTest} disabled={testing || !configured}>
              {testing ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
          {!configured && <p className="text-xs text-amber-600">Save SMTP settings first, then send a test.</p>}
        </Card>

        <Card className="p-5 bg-muted/30">
          <h3 className="font-semibold mb-2">Common SMTP providers</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Gmail:</strong> smtp.gmail.com:587, TLS (use App Password, not your regular password)</p>
            <p><strong>Outlook/Hotmail:</strong> smtp.office365.com:587, TLS</p>
            <p><strong>Yahoo:</strong> smtp.mail.yahoo.com:587, TLS</p>
            <p><strong>SendGrid:</strong> smtp.sendgrid.net:587, TLS (user: apikey, pass: your API key)</p>
            <p><strong>Mailgun:</strong> smtp.mailgun.org:587, TLS</p>
            <p><strong>Amazon SES:</strong> email-smtp.[region].amazonaws.com:587, TLS</p>
            <p><strong>Zoho:</strong> smtp.zoho.com:465, SSL (or :587 with TLS)</p>
            <p><strong>ProtonMail:</strong> smtp.protonmail.com:587, TLS (requires Bridge)</p>
          </div>
        </Card>
      </TabsContent>

      {/* WELCOME EMAIL CONFIG */}
      <TabsContent value="welcome" className="mt-4 space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Welcome Discount Email</h3>
              <p className="text-xs text-muted-foreground mt-1">When someone subscribes to your newsletter, automatically email them a discount code.</p>
            </div>
            <Switch
              checked={welcomeConfig.newsletter_welcome_enabled}
              onCheckedChange={(v) => setWelcomeField('newsletter_welcome_enabled', v)}
              aria-label="Enable welcome email"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Discount Percentage</Label>
              <Input type="number" min="1" max="100" value={welcomeConfig.newsletter_welcome_discount_percent} onChange={(e) => setWelcomeField('newsletter_welcome_discount_percent', e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">% off their first order</p>
            </div>
            <div>
              <Label className="text-xs">Code Prefix</Label>
              <Input value={welcomeConfig.newsletter_welcome_code_prefix} onChange={(e) => setWelcomeField('newsletter_welcome_code_prefix', e.target.value.toUpperCase())} placeholder="WELCOME" className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Each subscriber gets a unique code like WELCOME-AB12CD</p>
            </div>
          </div>

          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700">
            <strong>How it works:</strong> When a visitor subscribes via the newsletter form, the system:
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              <li>Creates a unique discount code with your prefix + random suffix</li>
              <li>Sets it to {welcomeConfig.newsletter_welcome_discount_percent || '10'}% off, single-use</li>
              <li>Emails the subscriber a welcome message with the code</li>
            </ol>
            <p className="mt-2">Requires SMTP to be configured.</p>
          </div>

          <Button onClick={saveWelcome} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Welcome Settings'}
          </Button>
        </Card>
      </TabsContent>

      {/* SUBSCRIBE PROMPT CONFIG */}
      <TabsContent value="prompt" className="mt-4 space-y-4">
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Newsletter Subscribe Prompt</h3>
          <p className="text-xs text-muted-foreground">Customize the text shown in the newsletter signup section on your storefront.</p>

          <div>
            <Label className="text-xs">Title</Label>
            <Input value={welcomeConfig.newsletter_prompt_title} onChange={(e) => setWelcomeField('newsletter_prompt_title', e.target.value)} placeholder="Get 10% off your first order" />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Input value={welcomeConfig.newsletter_prompt_subtitle} onChange={(e) => setWelcomeField('newsletter_prompt_subtitle', e.target.value)} placeholder="Subscribe to our newsletter..." />
          </div>

          <Button onClick={saveWelcome} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Prompt'}
          </Button>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
