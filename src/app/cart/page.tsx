'use client'
import Link from 'next/link'
import { useCart } from '@/lib/cart-store'
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { toast } from '@/lib/toast'

export default function CartPage() {
  const { items, updateQuantity, removeItem, clear } = useCart()
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(null)
  const [validating, setValidating] = useState(false)

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const discountAmount = discountApplied
    ? discountApplied.type === 'PERCENTAGE'
      ? subtotal * (discountApplied.value / 100)
      : discountApplied.type === 'FIXED_AMOUNT'
        ? Math.min(discountApplied.value, subtotal)
        : 0
    : 0
  const finalTotal = subtotal - discountAmount
  const freeShipThreshold = 75
  const freeShip = finalTotal >= freeShipThreshold
  const shipping = freeShip ? 0 : (subtotal > 0 ? 8 : 0)

  const applyDiscount = async () => {
    if (!discountCode) return
    setValidating(true)
    try {
      const r = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, subtotal })
      })
      const d = await r.json()
      if (d.valid) {
        setDiscountApplied(d.discount)
        toast.success('Discount applied', `${d.discount.code} — ${d.discount.type === 'PERCENTAGE' ? `${d.discount.value}% off` : d.discount.type === 'FREE_SHIPPING' ? 'Free shipping' : `$${d.discount.value} off`}`)
      } else {
        toast.error('Invalid code', d.error || 'Discount is not valid')
        setDiscountApplied(null)
      }
    } catch {
      toast.error('Could not validate code')
    } finally {
      setValidating(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-ecom py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">Start shopping to add items to your cart.</p>
        <Button asChild className="mt-6">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container-ecom py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
        Your Cart
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((it) => (
              <li key={`${it.productId}-${it.variantId}`} className="py-5 flex gap-4">
                <Link href={`/products/${it.slug}`} className="shrink-0">
                  <div className="h-28 w-24 md:h-32 md:w-28 rounded-md overflow-hidden bg-muted">
                    {it.image && <img src={it.image} alt={it.name} className="h-full w-full object-cover" />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/products/${it.slug}`} className="font-medium hover:underline">
                      {it.name}
                    </Link>
                    <button
                      onClick={() => {
                        removeItem(it.productId, it.variantId)
                        toast.info('Item removed')
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {it.variantName && (
                    <p className="text-sm text-muted-foreground mt-0.5">{it.variantName}</p>
                  )}
                  {it.sku && (
                    <p className="text-xs text-muted-foreground mt-0.5">SKU: {it.sku}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-md border border-border">
                      <button onClick={() => updateQuantity(it.productId, it.variantId, it.quantity - 1)} className="px-2.5 py-1.5 hover:bg-muted" aria-label="Decrease">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 text-sm font-medium">{it.quantity}</span>
                      <button onClick={() => updateQuantity(it.productId, it.variantId, it.quantity + 1)} className="px-2.5 py-1.5 hover:bg-muted" aria-label="Increase">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-semibold">${(it.price * it.quantity).toFixed(2)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/products">← Continue shopping</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { clear(); toast.info('Cart cleared') }}>
              Clear cart
            </Button>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-border p-5 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

            {/* Discount */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-1.5 block">Discount code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
                <Button variant="outline" size="sm" onClick={applyDiscount} disabled={validating || !discountCode}>
                  {validating ? '...' : 'Apply'}
                </Button>
              </div>
              {discountApplied && (
                <p className="text-xs text-emerald-600 mt-1.5">✓ {discountApplied.code} applied</p>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">Try: <button onClick={() => setDiscountCode('WELCOME10')} className="font-mono hover:underline">WELCOME10</button></p>
            </div>

            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>−${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-lg">${(finalTotal + shipping).toFixed(2)}</span>
              </div>
            </div>

            <Button asChild size="lg" className="mt-5 w-full">
              <Link href="/checkout">
                Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">Secure checkout · Free returns within 30 days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
