'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useCart } from '@/lib/cart-store'
import Link from 'next/link'
import { Minus, Plus, X, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEffect } from 'react'
import Image from 'next/image'
import { toast } from '@/lib/toast'

export function CartDrawer({ open, onOpenChange }) {
  const { items, updateQuantity, removeItem, clear } = useCart()
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const freeShippingThreshold = 75
  const remaining = Math.max(0, freeShippingThreshold - subtotal)
  const progress = Math.min(100, (subtotal / freeShippingThreshold) * 100)

  // Sync to server when items change
  useEffect(() => {
    if (items.length === 0) return
    fetch('/api/cart/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    }).catch(() => {})
  }, [items])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Your Cart ({items.reduce((n, it) => n + it.quantity, 0)})
          </SheetTitle>
        </SheetHeader>

        {items.length > 0 && (
          <div className="px-5 py-3 bg-muted/40 border-b">
            {remaining > 0 ? (
              <p className="text-xs text-muted-foreground">
                Add <span className="font-semibold text-foreground">${remaining.toFixed(2)}</span> more for free shipping
              </p>
            ) : (
              <p className="text-xs text-emerald-600 font-medium">You've unlocked free shipping!</p>
            )}
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Looks like you haven&apos;t added anything yet. Let&apos;s fix that.
            </p>
            <Button asChild onClick={() => onOpenChange(false)}>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {items.map((it) => (
                <div key={`${it.productId}-${it.variantId}`} className="flex gap-3 py-3 px-2 border-b last:border-0">
                  <Link
                    href={`/products/${it.slug}`}
                    onClick={() => onOpenChange(false)}
                    className="shrink-0"
                  >
                    <div className="h-20 w-20 rounded-md overflow-hidden bg-muted">
                      {it.image && (
                        <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${it.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="font-medium text-sm hover:underline line-clamp-2"
                    >
                      {it.name}
                    </Link>
                    {it.variantName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{it.variantName}</p>
                    )}
                    <p className="text-sm font-semibold mt-1">${it.price.toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button
                          onClick={() => updateQuantity(it.productId, it.variantId, it.quantity - 1)}
                          className="px-2 py-1 hover:bg-muted"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-sm font-medium">{it.quantity}</span>
                        <button
                          onClick={() => updateQuantity(it.productId, it.variantId, it.quantity + 1)}
                          className="px-2 py-1 hover:bg-muted"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          removeItem(it.productId, it.variantId)
                          toast.info('Item removed')
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
              <Button asChild className="w-full" size="lg" onClick={() => onOpenChange(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="sm" onClick={() => onOpenChange(false)}>
                <Link href="/cart">View Cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
