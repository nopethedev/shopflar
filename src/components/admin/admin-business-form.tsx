'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { Save, Building2 } from 'lucide-react'

export function AdminBusinessForm({ initial }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (r.ok) {
        toast.success('Saved', 'Business details updated')
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

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Business Information</h3>
          <p className="text-xs text-muted-foreground">Displayed on legal pages, invoices, and order confirmations.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Trading Name</Label>
          <Input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="My Awesome Store" />
        </div>
        <div>
          <Label className="text-xs">Legal Name (if different)</Label>
          <Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="Awesome Store Ltd." />
        </div>
        <div>
          <Label className="text-xs">Registration Number</Label>
          <Input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="12345678" />
        </div>
        <div>
          <Label className="text-xs">VAT / Tax ID</Label>
          <Input value={form.vatNumber} onChange={(e) => set('vatNumber', e.target.value)} placeholder="GB123456789" />
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-sm font-semibold mb-3">Address</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Address Line 1</Label>
            <Input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Address Line 2 (optional)</Label>
            <Input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} placeholder="Suite 100" />
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">State / Province</Label>
            <Input value={form.state} onChange={(e) => set('state', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Postal Code</Label>
            <Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Country</Label>
            <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="United States" />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-sm font-semibold mb-3">Contact</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 123 4567" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          All fields are optional. Leave blank to omit from legal pages.
        </p>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Card>
  )
}
