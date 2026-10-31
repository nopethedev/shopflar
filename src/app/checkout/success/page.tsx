import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { getDiceConfig, isDiceEligibleOrder } from '@/lib/dice'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { MysteryReveal, DiceGame } from '@/components/storefront/order-extras'
import { CheckCircle2, Package, Truck, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({ searchParams }) {
  const sp = await searchParams
  const settings = await getStoreSettings()
  const categories = await db.category.findMany({ where: { isVisible: true } })
  const [order, diceConfig] = await Promise.all([
    db.order.findUnique({
      where: { id: sp.order },
      include: { items: true }
    }).catch(() => null),
    getDiceConfig()
  ])

  if (!order) notFound()

  let reveals = []
  try { reveals = JSON.parse(order.mysteryReveals || '[]') } catch { reveals = [] }
  const showDice = diceConfig.enabled && order.total > 0 && isDiceEligibleOrder(order)

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-2xl">
        <div className="text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            Thank you for your order!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Order <span className="font-semibold text-foreground">{order.orderNumber}</span> has been received.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A confirmation email has been sent to <span className="font-medium text-foreground">{order.email}</span>
          </p>
        </div>

        {reveals.length > 0 && <MysteryReveal reveals={reveals} />}

        {showDice && (
          <DiceGame orderId={order.id} sides={diceConfig.sides} target={diceConfig.target} currencySymbol={settings.currencySymbol || '$'} />
        )}

        <div className="mt-10 rounded-lg border border-border p-5">
          <h2 className="font-semibold mb-4">Order details</h2>
          <ul className="space-y-3">
            {order.items.map(it => (
              <li key={it.id} className="flex gap-3">
                <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                  {it.imageUrl && <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{it.name}</p>
                  {it.variantName && <p className="text-xs text-muted-foreground">{it.variantName}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {it.quantity}</p>
                </div>
                <p className="text-sm font-semibold">${(it.price * it.quantity).toFixed(2)}</p>
              </li>
            ))}
          </ul>
          <div className="border-t border-border mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
            {order.discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−${order.discountTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{order.shippingTotal === 0 ? 'Free' : `$${order.shippingTotal.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${order.taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t border-border pt-2 mt-2"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border p-5">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping to</h3>
          {order.shippingAddress && (
            <p className="text-sm text-muted-foreground">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
              {order.shippingAddress.address1}<br />
              {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
              {order.shippingAddress.country}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link href="/products">Continue shopping <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/orders">View my orders</Link>
          </Button>
        </div>
      </div>
    </StorefrontLayout>
  )
}
