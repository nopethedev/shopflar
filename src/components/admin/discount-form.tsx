'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPES = [
  { id: 'PERCENTAGE', title: 'Amount off order — percentage', hint: 'e.g. 20% off the whole order' },
  { id: 'FIXED_AMOUNT', title: 'Amount off order — fixed amount', hint: 'e.g. $15 off the whole order' },
  { id: 'FREE_SHIPPING', title: 'Free shipping', hint: 'Waive the delivery fee' }
]

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

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.code.trim()) { toast.error('Add a discount code'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          code: form.code.trim().toUpperCase(),
          value: form.type === 'FREE_SHIPPING' ? 0 : Number(form.value) || 0,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
          perCustomerLimit: form.perCustomerLimit ? parseInt(form.perCustomerLimit) : null
        })
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      toast.success('Discount created', form.code.toUpperCase())
      router.push('/admin/discounts')
      router.refresh()
    } catch (e) {
      toast.error('Failed to create discount', e.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Link href="/admin/discounts" className="p-1.5 -ml-1 rounded-md hover:bg-[#e9e9e9] text-[#616161]" aria-label="Back to discounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Create discount</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/discounts" className="sf-btn sf-btn-secondary">Discard</Link>
          <button onClick={save} disabled={saving} className="sf-btn sf-btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save discount'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <div className="space-y-4">
          <div className="sf-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">Discount type</h2>
            </div>
            <div className="p-4 space-y-2">
              {TYPES.map(t => {
                const active = form.type === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set('type', t.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                      active ? 'border-[#1a1a1a] bg-[#fafafa]' : 'border-[#d9d9d9] hover:bg-[#fafafa]'
                    )}
                  >
                    <span className={cn(
                      'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                      active ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-[#c9c9c9]'
                    )}>
                      {active && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-[#1a1a1a]">{t.title}</span>
                      <span className="block text-[11px] text-[#8a8a8a]">{t.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">Discount code</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#616161] mb-1">Code</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="SUMMER25"
                    className="sf-input font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => set('code', Math.random().toString(36).slice(2, 10).toUpperCase())}
                    className="sf-btn sf-btn-secondary shrink-0"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[11px] text-[#8a8a8a] mt-1">Customers enter this at checkout.</p>
              </div>

              {form.type !== 'FREE_SHIPPING' && (
                <div>
                  <label className="block text-[11px] font-medium text-[#616161] mb-1">Value</label>
                  <div className="relative max-w-[180px]">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => set('value', e.target.value)}
                      className="sf-input pr-8"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                      {form.type === 'PERCENTAGE' ? '%' : '$'}
                    </span>
                  </div>
                </div>
              )}

              {form.type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-[11px] font-medium text-[#616161] mb-1">Maximum discount cap</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.maxDiscount}
                    onChange={(e) => set('maxDiscount', e.target.value)}
                    placeholder="No cap"
                    className="sf-input max-w-[180px]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">Minimum requirements</h2>
            </div>
            <div className="p-4">
              <label className="block text-[11px] font-medium text-[#616161] mb-1">Minimum order amount</label>
              <div className="relative max-w-[180px]">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={(e) => set('minOrderAmount', e.target.value)}
                  placeholder="None"
                  className="sf-input pl-6"
                />
              </div>
              <p className="text-[11px] text-[#8a8a8a] mt-1">Leave empty to allow any order value.</p>
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">Active dates</h2>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#616161] mb-1">Start date</label>
                <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="sf-input" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#616161] mb-1">End date</label>
                <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="sf-input" />
              </div>
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">Usage limits</h2>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#616161] mb-1">Total uses</label>
                <input type="number" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="Unlimited" className="sf-input" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#616161] mb-1">Per customer</label>
                <input type="number" value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} placeholder="Unlimited" className="sf-input" />
              </div>
            </div>
          </div>
        </div>

        <div className="sf-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e3e3e3]">
            <h2 className="sf-section-title">Status</h2>
          </div>
          <div className="p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-[#1a1a1a]">{form.isActive ? 'Active' : 'Inactive'}</p>
              <p className="text-[11px] text-[#8a8a8a]">
                {form.isActive ? 'Customers can use this code right away.' : 'The code exists but cannot be redeemed.'}
              </p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
          </div>
        </div>
      </div>
    </div>
  )
}
