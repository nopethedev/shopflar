'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from '@/lib/toast'
import { Save } from 'lucide-react'

export function DiscountForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: '',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    perCustomerLimit: '',
    isActive: true
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.code) { toast.error('Code required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase(),
          value: Number(form.value) || 0,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
          perCustomerLimit: form.perCustomerLimit ? parseInt(form.perCustomerLimit) : null
        })
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      toast.success('Discount created')
      router.push('/admin/discounts')
      router.refresh()
    } catch (e) {
      toast.error('Failed', e.message)
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <Label>Code</Label>
        <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="SUMMER25" className="font-mono uppercase" />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Discount Type</Label>
        <RadioGroup value={form.type} onValueChange={(v) => set('type', v)}>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="PERCENTAGE" />
              <div>
                <p className="text-sm font-medium">Percentage</p>
                <p className="text-xs text-muted-foreground">e.g., 10% off entire order</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="FIXED_AMOUNT" />
              <div>
                <p className="text-sm font-medium">Fixed amount</p>
                <p className="text-xs text-muted-foreground">e.g., $15 off</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value="FREE_SHIPPING" />
              <div>
                <p className="text-sm font-medium">Free shipping</p>
                <p className="text-xs text-muted-foreground">Waive shipping fee</p>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      {form.type !== 'FREE_SHIPPING' && (
        <div>
          <Label>{form.type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount ($)'}</Label>
          <Input type="number" step="0.01" value={form.value} onChange={(e) => set('value', e.target.value)} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Minimum order amount ($)</Label>
          <Input type="number" step="0.01" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} placeholder="No minimum" />
        </div>
        <div>
          <Label>Maximum discount ($)</Label>
          <Input type="number" step="0.01" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="No cap" />
        </div>
        <div>
          <Label>Start date</Label>
          <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div>
          <Label>End date</Label>
          <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </div>
        <div>
          <Label>Total usage limit</Label>
          <Input type="number" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="Unlimited" />
        </div>
        <div>
          <Label>Per-customer limit</Label>
          <Input type="number" value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} placeholder="Unlimited" />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
        <div>
          <Label>Active</Label>
          <p className="text-xs text-muted-foreground">Disable to pause this discount</p>
        </div>
        <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
      </div>

      <Button onClick={save} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Create Discount'}
      </Button>
    </Card>
  )
}
