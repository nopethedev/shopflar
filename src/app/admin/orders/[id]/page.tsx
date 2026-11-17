import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { resolveCarrierUrl } from '@/lib/tracking'
import { AdminOrderActions } from '@/components/admin/admin-order-actions'
import { OrderEditor } from '@/components/admin/order-editor'
import { ArrowLeft, ExternalLink, Mail, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const money = (n: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD' }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'sf-badge-success' },
  UNPAID: { label: 'Payment pending', cls: 'sf-badge-warning' },
  PENDING: { label: 'Payment pending', cls: 'sf-badge-warning' },
  REFUNDED: { label: 'Refunded', cls: 'sf-badge-danger' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', cls: 'sf-badge-info' }
}

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

  const [customerOrders, products] = await Promise.all([
    db.order.count({ where: { email: order.email } }),
    db.product.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { name: 'asc' },
      take: 200,
      select: {
        id: true,
        name: true,
        price: true,
        sku: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        variants: { select: { id: true, name: true, price: true, sku: true } }
      }
    })
  ])
  const trackingUrl = order.trackingUrl || (order.trackingNumber ? resolveCarrierUrl(order.trackingCarrier, order.trackingNumber) : null)
  const payment = PAYMENT_BADGE[order.paymentStatus] || { label: order.paymentStatus, cls: 'sf-badge-neutral' }
  const fulfilled = order.fulfillmentStatus === 'FULFILLED'
  const ship = (order.shippingAddress || {}) as Record<string, string>
  const bill = (order.billingAddress || {}) as Record<string, string>
  const paidPayment = order.payments.find(p => p.status === 'SUCCEEDED')
  const itemCount = order.items.reduce((n, it) => n + it.quantity, 0)

  const events: { title: string; detail?: string; at: Date; tone: string }[] = [
    { title: 'Order placed', detail: `Confirmation sent to ${order.email}`, at: order.createdAt, tone: 'bg-[#1a1a1a]' }
  ]
  order.payments.forEach(p => {
    events.push({
      title: p.status === 'SUCCEEDED' ? 'Payment received' : `Payment ${p.status.toLowerCase()}`,
      detail: `${p.provider.toUpperCase()} · ${money(p.amount, p.currency)}`,
      at: p.createdAt,
      tone: 'bg-emerald-500'
    })
  })
  if (fulfilled || ['SHIPPED', 'DELIVERED'].includes(order.status)) {
    events.push({
      title: order.status === 'DELIVERED' ? 'Order delivered' : 'Order fulfilled',
      detail: order.trackingNumber ? `${order.shippingMethod || 'Shipping'} · ${order.trackingCarrier || 'Carrier'} ${order.trackingNumber}` : order.shippingMethod || undefined,
      at: order.updatedAt,
      tone: 'bg-[#005bd3]'
    })
  }
  if (order.status === 'CANCELLED') {
    events.push({ title: 'Order cancelled', at: order.updatedAt, tone: 'bg-rose-500' })
  }
  if (order.status === 'REFUNDED') {
    events.push({ title: 'Order refunded', at: order.updatedAt, tone: 'bg-rose-500' })
  }
  events.sort((a, b) => +a.at - +b.at)

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <Link href="/admin/orders" className="mt-0.5 p-1.5 -ml-1 rounded-md hover:bg-[#e9e9e9] text-[#616161]" aria-label="Back to orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">{order.orderNumber}</h1>
              <span className={cn('sf-badge', payment.cls)}>{payment.label}</span>
              <span className={cn('sf-badge', fulfilled ? 'sf-badge-success' : 'sf-badge-neutral')}>
                {fulfilled ? 'Fulfilled' : 'Unfulfilled'}
              </span>
            </div>
            <p className="text-[13px] text-[#616161] mt-0.5">
              {new Date(order.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} at{' '}
              {new Date(order.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
              {' · '}{itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {!['CANCELLED', 'REFUNDED'].includes(order.status) && (
          <OrderEditor
            products={products}
            order={{
              id: order.id,
              orderNumber: order.orderNumber,
              items: order.items.map(it => ({
                id: it.id,
                name: it.name,
                variantName: it.variantName,
                sku: it.sku,
                price: it.price,
                quantity: it.quantity,
                imageUrl: it.imageUrl
              })),
              shippingAddress: order.shippingAddress,
              currency: order.currency,
              subtotal: order.subtotal,
              discountTotal: order.discountTotal,
              shippingTotal: order.shippingTotal,
              taxTotal: order.taxTotal
            }}
          />
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        {/* Main column */}
        <div className="space-y-4 min-w-0">
          <div className="sf-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">{fulfilled ? 'Items' : 'Unfulfilled items'}</h2>
              <span className="text-[12px] text-[#616161]">{itemCount} of {itemCount}</span>
            </div>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(it => (
                  <tr key={it.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-md bg-[#f1f1f1] overflow-hidden shrink-0">
                          {it.imageUrl && <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${it.productId}`} className="text-[13px] font-medium text-[#1a1a1a] hover:underline">
                            {it.name}
                          </Link>
                          {it.variantName && <p className="text-[11px] text-[#8a8a8a]">{it.variantName}</p>}
                          {it.sku && <p className="text-[11px] text-[#8a8a8a]">SKU {it.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-right text-[12px] whitespace-nowrap">{money(it.price, order.currency)}</td>
                    <td className="text-right text-[12px]">{it.quantity}</td>
                    <td className="text-right text-[12px] font-medium whitespace-nowrap">{money(it.price * it.quantity, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-4 py-3 border-t border-[#e3e3e3] space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[#616161]">Subtotal</span><span>{money(order.subtotal, order.currency)}</span></div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
                  <span>−{money(order.discountTotal, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-[#616161]">Shipping</span><span>{order.shippingTotal === 0 ? 'Free' : money(order.shippingTotal, order.currency)}</span></div>
              <div className="flex justify-between"><span className="text-[#616161]">Tax</span><span>{money(order.taxTotal, order.currency)}</span></div>
              <div className="flex justify-between text-[14px] font-semibold pt-2 mt-1 border-t border-[#e3e3e3]">
                <span>Total</span><span>{money(order.total, order.currency)}</span>
              </div>
              <p className="text-[11px] text-[#616161] pt-1">
                {paidPayment
                  ? `Paid by ${paidPayment.provider.toUpperCase()}${paidPayment.reference ? ` · ${paidPayment.reference}` : ''}`
                  : order.paymentStatus === 'PAID' ? 'Paid' : 'Payment not captured yet'}
              </p>
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="sf-card overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e3e3e3]">
                <h2 className="sf-section-title">Payment history</h2>
              </div>
              <ul className="divide-y divide-[#efefef]">
                {order.payments.map(p => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3 text-[12px]">
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{p.provider.toUpperCase()}</p>
                      <p className="text-[11px] text-[#8a8a8a]">{p.reference || '—'} · {new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{money(p.amount, p.currency)}</p>
                      <span className={cn('sf-badge', p.status === 'SUCCEEDED' ? 'sf-badge-success' : p.status === 'FAILED' ? 'sf-badge-danger' : 'sf-badge-neutral')}>
                        {p.status.toLowerCase()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(order.diceRoll != null || order.mysteryReveals) && (
            <div className="sf-card p-4">
              <h2 className="sf-section-title mb-2">Games &amp; mystery boxes</h2>
              {order.mysteryReveals && (() => {
                try {
                  const reveals = JSON.parse(order.mysteryReveals)
                  if (Array.isArray(reveals) && reveals.length > 0) {
                    return (
                      <div className="mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-[#8a8a8a] mb-1">Mystery box contents</p>
                        <ul className="text-[12px] space-y-0.5">
                          {reveals.map((r, i) => (
                            <li key={i}>
                              <span className="font-medium">{r.crateName}</span>
                              {r.quantity > 1 && ` ×${r.quantity}`}
                              {' — '}{(r.surprises || []).map(s => s.name).join(', ') || 'no random picks'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }
                } catch {}
                return null
              })()}
              {order.diceRoll != null && (
                <div className="text-[12px]">
                  <p className="text-[11px] uppercase tracking-wider text-[#8a8a8a] mb-1">Free order dice</p>
                  <p>
                    Rolled <span className="font-semibold">{order.diceRoll}</span> (target {order.diceTarget}) —{' '}
                    <span className={cn('sf-badge', order.diceWon ? 'sf-badge-success' : 'sf-badge-neutral')}>
                      {order.diceWon ? 'Won' : 'No win'}
                    </span>
                  </p>
                  {order.diceCouponCode && (
                    <p className="mt-1">Coupon issued: <code className="bg-[#f1f1f1] px-1.5 py-0.5 rounded font-mono">{order.diceCouponCode}</code></p>
                  )}
                </div>
              )}
            </div>
          )}

          {order.notes && (
            <div className="sf-card p-4">
              <h2 className="sf-section-title mb-1">Customer notes</h2>
              <p className="text-[12px] text-[#616161] whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {order.internalNotes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="sf-section-title mb-1 text-amber-900">Internal notes</h2>
              <p className="text-[12px] text-amber-800 whitespace-pre-wrap">{order.internalNotes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="sf-card p-4">
            <h2 className="sf-section-title mb-3">Timeline</h2>
            <ol className="space-y-3.5">
              {events.map((e, i) => (
                <li key={i} className="relative pl-5">
                  <span className={cn('absolute left-0 top-1.5 h-2 w-2 rounded-full', e.tone)} />
                  {i < events.length - 1 && <span className="absolute left-[3px] top-4 bottom-[-10px] w-px bg-[#e3e3e3]" />}
                  <p className="text-[12px] font-medium text-[#1a1a1a]">{e.title}</p>
                  {e.detail && <p className="text-[11px] text-[#616161]">{e.detail}</p>}
                  <p className="text-[11px] text-[#8a8a8a]">
                    {new Date(e.at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}{' · '}
                    {new Date(e.at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Customer */}
          <div className="sf-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="sf-section-title">Customer</h2>
              {order.user && (
                <Link href={`/admin/customers/${order.user.id}`} className="text-[12px] text-[#005bd3] hover:underline">
                  View profile
                </Link>
              )}
            </div>
            <div className="space-y-1.5 text-[12px]">
              <p className="flex items-center gap-1.5 font-medium text-[#1a1a1a]">
                <User className="h-3.5 w-3.5 text-[#8a8a8a]" />
                {[ship.firstName, ship.lastName].filter(Boolean).join(' ') || order.email.split('@')[0]}
              </p>
              <p className="flex items-center gap-1.5 text-[#616161]">
                <Mail className="h-3.5 w-3.5 text-[#8a8a8a]" />
                <a href={`mailto:${order.email}`} className="hover:underline truncate">{order.email}</a>
              </p>
              <p className="text-[#616161] pl-5">{customerOrders} order{customerOrders === 1 ? '' : 's'} placed</p>
              {ship.phone && <p className="text-[#616161] pl-5">{ship.phone}</p>}
            </div>
          </div>

          {/* Shipping address */}
          <div className="sf-card p-4">
            <h2 className="sf-section-title mb-2">Shipping address</h2>
            {order.shippingAddress ? (
              <p className="text-[12px] text-[#616161] leading-relaxed">
                <MapPin className="h-3.5 w-3.5 inline mr-1 text-[#8a8a8a]" />
                {ship.firstName} {ship.lastName}<br />
                {ship.company && <>{ship.company}<br /></>}
                {ship.address1}<br />
                {ship.address2 && <>{ship.address2}<br /></>}
                {ship.city}{ship.state ? `, ${ship.state}` : ''} {ship.postalCode}<br />
                {ship.country}
              </p>
            ) : (
              <p className="text-[12px] text-[#8a8a8a]">No shipping address on this order.</p>
            )}
            {bill.address1 && (
              <p className="text-[11px] text-[#8a8a8a] mt-2 pt-2 border-t border-[#efefef]">
                Billing: {bill.city}{bill.country ? `, ${bill.country}` : ''}
              </p>
            )}
          </div>

          {/* Delivery */}
          {(order.shippingMethod || order.trackingNumber) && (
            <div className="sf-card p-4">
              <h2 className="sf-section-title mb-2">Delivery</h2>
              <p className="text-[12px] text-[#616161]">{order.shippingMethod || 'Shipping method not set'}</p>
              {order.trackingNumber && (
                <p className="text-[11px] text-[#8a8a8a] mt-1">
                  <span className="font-mono">{order.trackingNumber}</span>
                  {order.trackingCarrier ? ` · ${order.trackingCarrier}` : ''}
                </p>
              )}
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[#005bd3] hover:underline mt-1">
                  Track package <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <AdminOrderActions order={order} />
        </div>
      </div>
    </div>
  )
}
