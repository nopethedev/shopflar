'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { COUNTRIES } from '@/lib/countries'
import { Save, Building2, Shield, Scroll, Globe } from 'lucide-react'

export function AdminBusinessForm({ initial }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ...initial,
    // EU compliance fields
    legalForm: initial.legalForm || '',
    representatives: initial.representatives || '',
    supervisingAuthority: initial.supervisingAuthority || '',
    responsiblePersonName: initial.responsiblePersonName || '',
    responsiblePersonAddress: initial.responsiblePersonAddress || '',
    responsiblePersonEmail: initial.responsiblePersonEmail || '',
    responsiblePersonPhone: initial.responsiblePersonPhone || '',
    lucidNumber: initial.lucidNumber || 'DE4139628009499',
    ossNumber: initial.ossNumber || '',
    iosNumber: initial.iosNumber || ''
  })
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
    <Tabs defaultValue="business">
      <TabsList>
        <TabsTrigger value="business" className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Business</TabsTrigger>
        <TabsTrigger value="eu" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> EU Compliance</TabsTrigger>
        <TabsTrigger value="tax" className="flex items-center gap-1.5"><Scroll className="h-3.5 w-3.5" /> Tax &amp; VAT</TabsTrigger>
      </TabsList>

      {/* BUSINESS */}
      <TabsContent value="business" className="mt-4">
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
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
              <div><Label className="text-xs">State / Province</Label><Input value={form.state} onChange={(e) => set('state', e.target.value)} /></div>
              <div><Label className="text-xs">Postal Code</Label><Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} /></div>
              <div><Label className="text-xs">Country</Label><select value={form.country || ''} onChange={(e) => set('country', e.target.value)} className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm"><option value="">Select country…</option>{COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold mb-3">Contact</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 123 4567" /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">All fields are optional. Leave blank to omit from legal pages.</p>
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </Card>
      </TabsContent>

      {/* EU COMPLIANCE */}
      <TabsContent value="eu" className="mt-4 space-y-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">EU Responsible Person (GPSR)</h3>
              <p className="text-xs text-muted-foreground">Required by EU GPSR (effective Dec 13, 2024). Must be based in the EU or Northern Ireland.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Responsible Person Name</Label>
              <Input value={form.responsiblePersonName} onChange={(e) => set('responsiblePersonName', e.target.value)} placeholder="John Doe / Compliance Officer" />
            </div>
            <div>
              <Label className="text-xs">Responsible Person Address (EU/NI — no PO Box)</Label>
              <Textarea rows={2} value={form.responsiblePersonAddress} onChange={(e) => set('responsiblePersonAddress', e.target.value)} placeholder="123 Main Street&#10;Berlin, 10115, Germany" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Responsible Person Email</Label>
                <Input type="email" value={form.responsiblePersonEmail} onChange={(e) => set('responsiblePersonEmail', e.target.value)} placeholder="compliance@yourstore.com" />
              </div>
              <div>
                <Label className="text-xs">Responsible Person Phone</Label>
                <Input value={form.responsiblePersonPhone} onChange={(e) => set('responsiblePersonPhone', e.target.value)} placeholder="+49 30 12345678" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>⚠️ GPSR Compliance:</strong> If you sell to EU/NI customers, you must designate a Responsible Person based in the EU or Northern Ireland.
            This person/entity is responsible for product safety compliance. For Printify sellers, this can be your own EU business or a third-party compliance service.
            Non-compliance can result in fines up to €100,000 and your products being blocked from EU marketplaces.
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">German Impressum (DDG §5)</h3>
              <p className="text-xs text-muted-foreground">Required for any commercial website targeting German customers. Non-compliance fines up to €50,000.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Legal Form</Label>
              <Input value={form.legalForm} onChange={(e) => set('legalForm', e.target.value)} placeholder="GmbH, UG, Ltd, LLC, sole trader..." />
            </div>
            <div>
              <Label className="text-xs">Share Capital (if applicable)</Label>
              <Input value={form.shareCapital || ''} onChange={(e) => set('shareCapital', e.target.value)} placeholder="€25,000" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Legal Representatives (directors/owners)</Label>
              <Textarea rows={2} value={form.representatives} onChange={(e) => set('representatives', e.target.value)} placeholder="Jane Doe (CEO)&#10;John Smith (COO)" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Supervising Authority (if regulated)</Label>
              <Input value={form.supervisingAuthority} onChange={(e) => set('supervisingAuthority', e.target.value)} placeholder="Leave blank if not applicable" />
            </div>
          </div>

          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700">
            <strong>📋 Impressum:</strong> These fields appear on your <a href="/impressum" className="underline" target="_blank">/impressum</a> page.
            German law requires this page to be reachable within 2 clicks from any page.
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Scroll className="h-4 w-4" /> Packaging Registration (LUCID)</h3>
          <div>
            <Label className="text-xs">LUCID Registration Number (Germany)</Label>
            <Input value={form.lucidNumber} onChange={(e) => set('lucidNumber', e.target.value)} placeholder="DE4139628009499" className="font-mono" />
            <p className="text-xs text-muted-foreground mt-1">
              Required for selling packaged goods to Germany. Printify&apos;s LUCID number (DE4139628009499) covers Printify-fulfilled orders.
              If you ship any orders yourself, you must register your own number at <a href="https://lucid.verpackungsregister.org" target="_blank" rel="noopener noreferrer" className="underline">lucid.verpackungsregister.org</a>.
            </p>
          </div>
        </Card>

        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save EU Compliance'}
        </Button>
      </TabsContent>

      {/* TAX & VAT */}
      <TabsContent value="tax" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Scroll className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold">VAT &amp; Tax Registration</h3>
              <p className="text-xs text-muted-foreground">EU OSS/IOSS registration numbers for cross-border sales.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">VAT ID (already in Business tab)</Label>
              <Input value={form.vatNumber} onChange={(e) => set('vatNumber', e.target.value)} placeholder="GB123456789 / DE123456789" />
            </div>
            <div>
              <Label className="text-xs">OSS Number (One Stop Shop)</Label>
              <Input value={form.ossNumber} onChange={(e) => set('ossNumber', e.target.value)} placeholder="OSS-123456789" className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Required if cross-border EU B2C sales exceed €10,000/year. Register in one EU member state.</p>
            </div>
            <div>
              <Label className="text-xs">IOSS Number (Import One Stop Shop)</Label>
              <Input value={form.iosNumber} onChange={(e) => set('iosNumber', e.target.value)} placeholder="IM1234567890" className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">For non-EU sellers importing goods ≤€150 into the EU. Requires an EU-based intermediary.</p>
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/30 text-xs text-muted-foreground">
            <strong>💡 EU VAT Rules:</strong> If you sell to EU consumers:
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Below €10,000/yr cross-border: use your home country VAT</li>
              <li>Above €10,000/yr: register for OSS in one EU member state</li>
              <li>Non-EU sellers: must register for IOSS for imports ≤€150</li>
              <li>Prices shown to EU consumers must include VAT</li>
            </ul>
          </div>

          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Tax Info'}
          </Button>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
