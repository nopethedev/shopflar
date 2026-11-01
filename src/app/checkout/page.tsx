'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/cart-store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { ShoppingBag, Lock, ChevronRight, CreditCard } from 'lucide-react'
import { toast } from '@/lib/toast'
import { COUNTRIES } from '@/lib/countries'
import { useSession } from '@/components/storefront/session-provider'

export default function CheckoutPage() {
  const { items, clear } = useCart()
  const router = useRouter()
  const { user } = useSession()
  const [loading, setLoading] = useState(false)
  const [shippingMethods, setShippingMethods] = useState([])
  const [paymentProviders, setPaymentProviders] = useState([])
  const [shippingAddress, setShippingAddress] = useState(null)
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', address1: '', address2: '', city: '', state: '', postalCode: '', country: 'US', phone: '',
    shippingMethodId: '', paymentProvider: 'cod', discountCode: '', notes: '',
    createAccount: false, password: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetch('/api/shipping/methods').then(r => r.json()).then(d => setShippingMethods(d.methods || [])).catch(() => {})
    fetch('/api/payments/providers').then(r => r.json()).then(d => setPaymentProviders(d.providers || [])).catch(() => {})
    if (user) {
      setForm(f => ({ ...f, email: user.email || '', firstName: user.profile?.firstName || '', lastName: user.profile?.lastName || '' }))
    }
  }, [user])

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const selectedShip = shippingMethods.find(m => m.id === form.shippingMethodId)
  const shippingCost = selectedShip
    ? selectedShip.freeShippingThreshold && subtotal >= selectedShip.freeShippingThreshold
      ? 0
      : selectedShip.price
    : 0
  const total = subtotal + shippingCost

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email is required'
    if (!form.firstName) e.firstName = 'Required'
    if (!form.lastName) e.lastName = 'Required'
    if (!form.address1) e.address1 = 'Required'
    if (!form.city) e.city = 'Required'
    if (!form.postalCode) e.postalCode = 'Required'
    if (!form.country) e.country = 'Required'
    if (!form.shippingMethodId) e.shippingMethodId = 'Select a shipping method'
    if (form.createAccount && (!form.password || form.password.length < 8)) e.password = 'Min 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) {
      toast.error('Please check the form', 'Some required fields are missing.')
      return
    }
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone,
          shippingMethodId: form.shippingMethodId,
          paymentProvider: form.paymentProvider,
          discountCode: form.discountCode,
          notes: form.notes,
          createAccount: form.createAccount,
          password: form.password
        })
      })
      const d = await res.json()
      if (!res.ok) {
        throw new Error(d.error || 'Checkout failed')
      }
      if (d.redirect) {
        // PayPal or external redirect
        window.location.href = d.redirect
        return
      }
      if (d.clientSecret) {
        // Stripe — redirect to confirmation page; in real impl we'd mount the Stripe widget
        router.push(`/checkout/success?order=${d.orderId}`)
      } else {
        // COD — order placed
        clear()
        router.push(`/checkout/success?order=${d.orderId}`)
      }
    } catch (e) {
      toast.error('Checkout failed', e.message)
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-ecom py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">Add some products before checking out.</p>
        <Button asChild className="mt-6">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container-ecom py-8 md:py-12">
      <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
        ← Back to cart
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
        Checkout
      </h1>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-8">
          {/* Account */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Contact</h2>
              {!user && (
                <Link href="/login?next=/checkout" className="text-sm text-muted-foreground hover:text-foreground">
                  Sign in
                </Link>
              )}
            </div>
            <div className="grid gap-3">
              <Field label="Email" required error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
              </Field>
              {!user && (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="createAcct"
                    checked={form.createAccount}
                    onCheckedChange={(c) => set('createAccount', c)}
                  />
                  <Label htmlFor="createAcct" className="text-sm font-normal cursor-pointer">
                    Create an account for faster checkout next time
                  </Label>
                </div>
              )}
              {form.createAccount && (
                <Field label="Password" error={errors.password}>
                  <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 characters" />
                </Field>
              )}
            </div>
          </section>

          {/* Shipping address */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Shipping Address</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required error={errors.firstName}>
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </Field>
              <Field label="Last name" required error={errors.lastName}>
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Address" required error={errors.address1}>
                  <Input value={form.address1} onChange={(e) => set('address1', e.target.value)} placeholder="Street address" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Apartment, suite, etc. (optional)">
                  <Input value={form.address2} onChange={(e) => set('address2', e.target.value)} />
                </Field>
              </div>
              <Field label="City" required error={errors.city}>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="State/Province">
                <Input value={form.state} onChange={(e) => set('state', e.target.value)} />
              </Field>
              <Field label="Postal code" required error={errors.postalCode}>
                <Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
              </Field>
              <Field label="Country" required error={errors.country}>
                <select
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Phone (optional)">
                  <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="For shipping updates" />
                </Field>
              </div>
            </div>
          </section>

          {/* Shipping method */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Shipping Method</h2>
            {shippingMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading shipping options...</p>
            ) : (
              <RadioGroup value={form.shippingMethodId} onValueChange={(v) => set('shippingMethodId', v)}>
                <div className="space-y-2">
                  {shippingMethods.map(m => {
                    const cost = m.freeShippingThreshold && subtotal >= m.freeShippingThreshold ? 0 : m.price
                    return (
                      <label
                        key={m.id}
                        htmlFor={`ship-${m.id}`}
                        className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition-colors ${
                          form.shippingMethodId === m.id ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem id={`ship-${m.id}`} value={m.id} />
                          <div>
                            <p className="text-sm font-medium">{m.name}</p>
                            {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                          </div>
                        </div>
                        <p className="text-sm font-semibold">{cost === 0 ? 'Free' : `$${cost.toFixed(2)}`}</p>
                      </label>
                    )
                  })}
                </div>
              </RadioGroup>
            )}
            {errors.shippingMethodId && <p className="text-xs text-destructive mt-1">{errors.shippingMethodId}</p>}
          </section>

          {/* Payment */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Payment</h2>
            <RadioGroup value={form.paymentProvider} onValueChange={(v) => set('paymentProvider', v)}>
              <div className="space-y-2">
                {paymentProviders.map(p => (
                  <label
                    key={p.id}
                    htmlFor={`pay-${p.id}`}
                    className={`flex items-center justify-between p-4 rounded-md border cursor-pointer ${
                      form.paymentProvider === p.id ? 'border-foreground bg-muted/40' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem id={`pay-${p.id}`} value={p.id} />
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {p.name}
                          {p.testMode && <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Test</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </div>
                    {p.icon && <p.icon className="h-5 w-5 text-muted-foreground" />}
                  </label>
                ))}
              </div>
            </RadioGroup>
            {!paymentProviders.find(p => p.id !== 'cod') && (
              <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <strong>Demo mode:</strong> No payment providers configured. You can complete checkout with Cash on Delivery, or configure Stripe/PayPal via Admin → Payments.
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <div>
          <div className="rounded-lg border border-border p-5 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <ul className="space-y-3 max-h-[400px] overflow-y-auto">
              {items.map((it) => (
                <li key={`${it.productId}-${it.variantId}`} className="flex gap-3">
                  <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                    {it.image && <img src={it.image} alt={it.name} className="h-full w-full object-cover" />}
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-foreground text-background text-[10px] font-semibold flex items-center justify-center">
                      {it.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{it.name}</p>
                    {it.variantName && <p className="text-xs text-muted-foreground">{it.variantName}</p>}
                    <p className="text-sm font-semibold mt-1">${(it.price * it.quantity).toFixed(2)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Separator className="my-4" />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-muted-foreground">Calculated after payment</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={submit}
              disabled={loading}
            >
              {loading ? 'Processing...' : (
                <>
                  <Lock className="h-4 w-4 mr-2" /> Place Order
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              By placing your order, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <Label className="text-xs font-medium mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
