'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const money = (n: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD' }).format(n || 0)
  } catch {
    return `$${(n || 0).toFixed(2)}`
  }
}

const ADDRESS_FIELDS = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['company', 'Company'],
  ['address1', 'Address'],
  ['address2', 'Apartment, suite, etc.'],
  ['city', 'City'],
  ['state', 'State / province'],
  ['postalCode', 'Postal code'],
  ['country', 'Country'],
  ['phone', 'Phone']
]

export function OrderEditor({ order, products }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [address, setAddress] = useState<Record<string, string>>({})
  const [productId, setProductId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [addQty, setAddQty] = useState(1)

  useEffect(() => {
    if (!open) return
    setItems(order.items.map((i: any) => ({ ...i, key: i.id })))
    setAddress((order.shippingAddress || {}) as Record<string, string>)
    setProductId('')
    setVariantId('')
    setAddQty(1)
    setError('')
  }, [open, order])

  const selectedProduct = useMemo(
    () => products.find((p: any) => p.id === productId),
    [products, productId]
  )
  const selectedVariant = useMemo(
    () => selectedProduct?.variants?.find((v: any) => v.id === variantId),
    [selectedProduct, variantId]
  )

  const subtotal = useMemo(
    () => Math.round(items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0) * 100) / 100,
    [items]
  )
  const total = useMemo(
    () => Math.round(Math.max(0, subtotal - order.discountTotal + order.shippingTotal + order.taxTotal) * 100) / 100,
    [subtotal, order]
  )

  const setQty = (key: string, value: string) => {
    const qty = Math.min(999, Math.max(1, parseInt(value) || 1))
    setItems(prev => prev.map(i => i.key === key ? { ...i, quantity: qty } : i))
  }

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key))

  const addItem = () => {
    if (!selectedProduct) return
    if (selectedProduct.variants?.length && !selectedVariant) {
      toast.error('Choose a variant first')
      return
    }
    const price = selectedVariant?.price ?? selectedProduct.price
    setItems(prev => [...prev, {
      key: `new-${Date.now()}`,
      productId: selectedProduct.id,
      variantId: selectedVariant?.id || null,
      name: selectedProduct.name,
      variantName: selectedVariant?.name || null,
      sku: selectedVariant?.sku || selectedProduct.sku || null,
      price,
      quantity: addQty,
      imageUrl: selectedProduct.images?.[0]?.url || null,
      isNew: true
    }])
    setProductId('')
    setVariantId('')
    setAddQty(1)
  }

  const setAddressField = (key: string, value: string) =>
    setAddress(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!items.length) {
      setError('An order needs at least one line item.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        items: items.filter(i => i.id).map(i => ({ id: i.id, quantity: i.quantity })),
        removedItemIds: order.items.filter((oi: any) => !items.some(i => i.id === oi.id)).map((i: any) => i.id),
        addItems: items.filter(i => !i.id).map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity
        })),
        shippingAddress: address
      }
      const r = await fetch(`/api/admin/orders/${order.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Could not save order')
      toast.success('Order updated', `${items.length} line item${items.length === 1 ? '' : 's'}`)
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      toast.error('Order update failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="sf-btn sf-btn-secondary">
          <Pencil className="h-3.5 w-3.5" /> Edit order
        </button>
      </DialogTrigger>
      {/* Rendered in a body portal, outside the admin shell, so the sf-* styles
          need the shell class here or inputs/buttons render unstyled. */}
      <DialogContent className="admin-shell w-[calc(100vw-2rem)] max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 py-3.5 border-b border-[#e3e3e3]">
          <DialogTitle className="text-[15px] text-left">Edit {order.orderNumber}</DialogTitle>
          <p className="text-[11px] text-[#8a8a8a] text-left">
            Change quantities, add or remove items, and update the shipping address. Totals recalculate automatically.
          </p>
        </DialogHeader>

        <div className="p-5 space-y-5">
          <div className="rounded-lg border border-[#e3e3e3] overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#e3e3e3] flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-[#1a1a1a]">Line items</h3>
              <span className="text-[11px] text-[#8a8a8a]">{items.reduce((n, i) => n + i.quantity, 0)} units</span>
            </div>
            <div className="divide-y divide-[#efefef]">
              {items.length === 0 && (
                <p className="px-3.5 py-4 text-[12px] text-[#8a8a8a]">No line items — add at least one below.</p>
              )}
              {items.map(item => (
                <div key={item.key} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="h-9 w-9 rounded bg-[#f1f1f1] overflow-hidden shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#1a1a1a] truncate">{item.name}</p>
                    <p className="text-[11px] text-[#8a8a8a] truncate">
                      {[item.variantName, item.sku ? `SKU ${item.sku}` : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#616161] w-16 text-right">{money(item.price, order.currency)}</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={item.quantity}
                    onChange={(e) => setQty(item.key, e.target.value)}
                    className="sf-input !w-16 shrink-0 text-center"
                    aria-label={`Quantity for ${item.name}`}
                  />
                  <span className="text-[12px] font-medium w-20 text-right">{money(item.price * item.quantity, order.currency)}</span>
                  <button
                    onClick={() => removeItem(item.key)}
                    className="p-1.5 rounded text-[#8a8a8a] hover:text-rose-600 hover:bg-rose-50"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-3.5 py-3 border-t border-[#e3e3e3] bg-[#fafafa] space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-medium text-[#616161] mb-1">Add product</label>
                  <select
                    value={productId}
                    onChange={(e) => { setProductId(e.target.value); setVariantId('') }}
                    className="sf-input"
                    aria-label="Product to add"
                  >
                    <option value="">Choose a product…</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — {money(p.price, order.currency)}</option>
                    ))}
                  </select>
                </div>
                {!!selectedProduct?.variants?.length && (
                  <div className="min-w-[150px]">
                    <label className="block text-[10px] font-medium text-[#616161] mb-1">Variant</label>
                    <select
                      value={variantId}
                      onChange={(e) => setVariantId(e.target.value)}
                      className="sf-input"
                      aria-label="Variant to add"
                    >
                      <option value="">Choose…</option>
                      {selectedProduct.variants.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.name} — {money(v.price ?? selectedProduct.price, order.currency)}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="w-20">
                  <label className="block text-[10px] font-medium text-[#616161] mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={addQty}
                    onChange={(e) => setAddQty(Math.min(999, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="sf-input"
                    aria-label="Quantity to add"
                  />
                </div>
                <button onClick={addItem} disabled={!productId} className="sf-btn sf-btn-secondary disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {ADDRESS_FIELDS.map(([key, label]) => (
              <div key={key} className={cn(key === 'address1' || key === 'address2' ? 'sm:col-span-2' : '')}>
                <label className="block text-[11px] font-medium text-[#616161] mb-1">{label}</label>
                <input
                  value={address[key] || ''}
                  onChange={(e) => setAddressField(key, e.target.value)}
                  className="sf-input"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-[#f7f7f7] p-3.5 text-[12px] space-y-1">
            <div className="flex justify-between"><span className="text-[#616161]">Subtotal</span><span>{money(subtotal, order.currency)}</span></div>
            {order.discountTotal > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{money(order.discountTotal, order.currency)}</span></div>}
            <div className="flex justify-between"><span className="text-[#616161]">Shipping</span><span>{money(order.shippingTotal, order.currency)}</span></div>
            <div className="flex justify-between"><span className="text-[#616161]">Tax</span><span>{money(order.taxTotal, order.currency)}</span></div>
            <div className="flex justify-between font-semibold pt-1 mt-1 border-t border-[#e3e3e3]"><span>New total</span><span>{money(total, order.currency)}</span></div>
            <p className="text-[10px] text-[#8a8a8a] pt-1">Discount, shipping and tax are kept as-is when line items change.</p>
          </div>

          {error && (
            <p className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e3e3e3]">
          <button onClick={() => setOpen(false)} className="sf-btn sf-btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="sf-btn sf-btn-primary disabled:opacity-50">
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : 'Save changes'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
