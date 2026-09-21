'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { CheckCircle2, Store, User, Database, Sparkles, ArrowRight, ArrowLeft, Shield } from 'lucide-react'

const steps = [
  { id: 0, label: 'Store', icon: Store },
  { id: 1, label: 'Admin Account', icon: User },
  { id: 2, label: 'Demo Data', icon: Sparkles },
  { id: 3, label: 'Done', icon: CheckCircle2 }
]

export function InstallWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    storeName: 'Shopflar',
    storeEmail: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    loadDemoData: true,
    currency: 'USD'
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Install failed')
      toast.success('Setup complete!', 'Your store is ready')
      setStep(3)
      setTimeout(() => {
        router.push('/login?next=/admin&installed=1')
      }, 2000)
    } catch (e) {
      toast.error('Install failed', e.message)
      setSubmitting(false)
    }
  }

  const next = () => setStep(s => Math.min(s + 1, 3))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const canProceed = () => {
    if (step === 0) return form.storeName && form.storeEmail && form.storeEmail.includes('@')
    if (step === 1) return form.adminEmail && form.adminEmail.includes('@') && form.adminPassword.length >= 8
    return true
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="h-10 w-10 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-lg" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            S
          </div>
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Shopflar</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Welcome — let&apos;s set up your store
        </h1>
        <p className="text-muted-foreground mt-2">This is a one-time setup. Takes about 30 seconds.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-8 gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i === step ? 'bg-foreground text-background' :
              i < step ? 'bg-emerald-100 text-emerald-700' :
              'bg-muted text-muted-foreground'
            }`}>
              <s.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      <Card className="p-6 md:p-8">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Store Information</h2>
              <p className="text-sm text-muted-foreground">Basic details about your store.</p>
            </div>
            <div>
              <Label>Store Name <span className="text-destructive">*</span></Label>
              <Input value={form.storeName} onChange={(e) => set('storeName', e.target.value)} placeholder="My Awesome Store" />
            </div>
            <div>
              <Label>Contact Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.storeEmail} onChange={(e) => set('storeEmail', e.target.value)} placeholder="hello@mystore.com" />
              <p className="text-xs text-muted-foreground mt-1">Used for order notifications and customer contact.</p>
            </div>
            <div>
              <Label>Currency</Label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Shield className="h-5 w-5" /> Create Admin Account
              </h2>
              <p className="text-sm text-muted-foreground">You&apos;ll use this to log in to the admin panel.</p>
            </div>
            <div>
              <Label>Your Name</Label>
              <Input value={form.adminName} onChange={(e) => set('adminName', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Admin Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} placeholder="admin@mystore.com" />
            </div>
            <div>
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="Min 8 characters" />
              {form.adminPassword && form.adminPassword.length < 8 && (
                <p className="text-xs text-amber-600 mt-1">Password must be at least 8 characters.</p>
              )}
            </div>
            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700">
              <strong>Security:</strong> Passwords are hashed with scrypt (Node built-in). Your admin account will have Super Admin privileges.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Demo Data</h2>
              <p className="text-sm text-muted-foreground">Load sample products to explore the platform.</p>
            </div>
            <label className="flex items-start gap-3 p-4 border border-border rounded-md cursor-pointer hover:bg-muted/30">
              <Checkbox
                checked={form.loadDemoData}
                onCheckedChange={(v) => set('loadDemoData', v)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Load demo data (recommended for first-time install)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates 8 sample products, 5 categories, 3 shipping methods, 3 discount codes, tax rates, and demo orders.
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-0.5 list-disc list-inside">
                  <li>T-shirts, hoodies, pants, hats, bags, sneakers</li>
                  <li>Discount codes: <code className="bg-muted px-1 rounded">WELCOME10</code>, <code className="bg-muted px-1 rounded">SAVE25</code>, <code className="bg-muted px-1 rounded">FREESHIP</code></li>
                  <li>3 demo orders in different statuses</li>
                </ul>
              </div>
            </label>
            <div className="p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
              You can safely delete demo data later from the admin panel. Skipping this gives you a completely empty store.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
            <p className="text-muted-foreground mb-6">Your store is ready. Redirecting to login...</p>
            <div className="h-1 w-32 mx-auto bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-foreground animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {step < 3 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={next} disabled={!canProceed()}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting || !canProceed()}>
                {submitting ? 'Setting up...' : 'Complete Setup'} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Already installed? <a href="/login" className="text-foreground hover:underline">Sign in</a> instead.
      </p>
    </div>
  )
}
