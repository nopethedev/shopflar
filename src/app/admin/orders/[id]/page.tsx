import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminOrderActions } from '@/components/admin/admin-order-actions'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({ params }) {
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      user: { include: { profile: true } },
      discountUsage: { include: { discount: true } }
    }
  })

  if (!order) notFound()

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{order.status.replace('_', ' ')}</Badge>
          <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
            {order.paymentStatus.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h2 className="font-semibold mb-4">Order Items</h2>
            <ul className="divide-y divide-border">
              {order.items.map(it => (
                <li key={it.id} className="py-3 first:pt-0 last:pb-0 flex gap-3">
                  <div className="h-14 w-14 rounded bg-muted overflow-hidden shrink-0">
                    {it.imageUrl && <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{it.name}</p>
                    {it.variantName && <p className="text-xs text-muted-foreground">{it.variantName}</p>}
                    {it.sku && <p className="text-xs text-muted-foreground">SKU: {it.sku}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm">${it.price.toFixed(2)} × {it.quantity}</p>
                    <p className="text-sm font-semibold">${(it.price * it.quantity).toFixed(2)}</p>
                  </div>
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

          {/* Payment history */}
          {order.payments.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="font-semibold mb-4">Payment History</h2>
              <ul className="space-y-2">
                {order.payments.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{p.provider.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${p.amount.toFixed(2)}</p>
                      <Badge variant={p.status === 'SUCCEEDED' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h2 className="font-semibold mb-3">Customer</h2>
            <p className="text-sm font-medium">{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</p>
            <p className="text-sm text-muted-foreground">{order.email}</p>
            {order.user && (
              <Link href={`/admin/customers/${order.user.id}`} className="text-xs text-foreground hover:underline">View customer profile →</Link>
            )}
          </div>

          {/* Shipping address */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h2 className="font-semibold mb-3">Shipping Address</h2>
            {order.shippingAddress && (
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                {order.shippingAddress.address1}<br />
                {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.country}
                {order.shippingAddress.phone && <><br />{order.shippingAddress.phone}</>}
              </p>
            )}
          </div>

          {/* Shipping */}
          {order.shippingMethod && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="font-semibold mb-2">Shipping Method</h2>
              <p className="text-sm">{order.shippingMethod}</p>
              {order.trackingNumber && (
                <p className="text-xs text-muted-foreground mt-1">Tracking: <span className="font-mono">{order.trackingNumber}</span></p>
              )}
            </div>
          )}

          {/* Admin actions */}
          <AdminOrderActions order={order} />

          {order.internalNotes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold mb-2 text-amber-900">Internal Notes</h2>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{order.internalNotes}</p>
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="font-semibold mb-2">Customer Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
