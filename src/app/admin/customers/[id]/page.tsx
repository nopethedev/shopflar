import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, MapPin, ShoppingBag, CheckCircle2, Clock, Tag } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  PAID: 'sf-badge-success',
  PROCESSING: 'sf-badge-info',
  SHIPPED: 'sf-badge-info',
  DELIVERED: 'sf-badge-success',
  PENDING: 'sf-badge-warning',
  PAYMENT_PENDING: 'sf-badge-warning',
  CANCELLED: 'sf-badge-danger',
  REFUNDED: 'sf-badge-neutral',
  FAILED: 'sf-badge-danger'
}

export default async function AdminCustomerDetailPage({ params }) {
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      orders: { orderBy: { createdAt: 'desc' }, include: { items: true } },
      addresses: true
    }
  })

  if (!user) notFound()

  const optedIn = await db.newsletterSubscriber.findUnique({ where: { email: user.email } })
  const validOrders = user.orders.filter(o => !['CANCELLED', 'FAILED'].includes(o.status))
  const totalSpent = validOrders.reduce((s, o) => s + o.total, 0)
  const lastOrder = user.orders[0]
  const daysSinceLast = lastOrder ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / 86400000) : null
  const isNew = new Date(user.createdAt).getTime() > Date.now() - 30 * 86400000
  const tags: string[] = []
  if (isNew) tags.push('New')
  if (validOrders.length >= 2) tags.push('Returning')
  if (validOrders.length >= 3 || totalSpent >= 500) tags.push('Loyal')
  if (daysSinceLast !== null && daysSinceLast > 60) tags.push('At risk')
  if (optedIn?.isActive) tags.push('Email subscriber')

  const name = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.name || user.email.split('@')[0]
  const defaultAddress = user.addresses.find(a => a.isDefault) || user.addresses[0]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/customers" className="p-1.5 rounded-md hover:bg-[#e3e3e3]/60" aria-label="Back to customers">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-[12px] text-[#616161]">Customers</span>
        <span className="text-[#c9c9c9]">/</span>
        <span className="text-[12px] font-medium">{name}</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-full bg-[#eef2f7] text-[#3d4f63] flex items-center justify-center text-[15px] font-semibold">
            {(name || user.email)[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">{name}</h1>
            <p className="text-[12px] text-[#616161]">
              {user.email} · Customer since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`mailto:${user.email}`} className="sf-btn sf-btn-secondary">
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
          <Link href={`/admin/orders?search=${encodeURIComponent(user.email)}`} className="sf-btn sf-btn-primary">
            View orders
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Main column */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="sf-card p-4">
              <p className="text-[12px] text-[#616161]">Orders</p>
              <p className="text-[22px] font-semibold mt-0.5">{validOrders.length}</p>
            </div>
            <div className="sf-card p-4">
              <p className="text-[12px] text-[#616161]">Amount spent</p>
              <p className="text-[22px] font-semibold mt-0.5">${totalSpent.toFixed(2)}</p>
            </div>
            <div className="sf-card p-4">
              <p className="text-[12px] text-[#616161]">Average order</p>
              <p className="text-[22px] font-semibold mt-0.5">${(validOrders.length ? totalSpent / validOrders.length : 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="sf-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e3e3]">
              <h2 className="sf-section-title">Orders</h2>
              <span className="text-[11px] text-[#8a8a8a]">{user.orders.length} total</span>
            </div>
            {user.orders.length === 0 ? (
              <div className="p-10 text-center">
                <ShoppingBag className="h-7 w-7 text-[#c9c9c9] mx-auto mb-2" />
                <p className="text-[13px] text-[#616161]">This customer hasn’t placed an order yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-right">Items</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.map(o => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="font-medium text-[#005bd3] hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="text-[#616161]">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td><span className={`sf-badge ${STATUS_BADGE[o.status] || 'sf-badge-neutral'}`}>{o.status.replace('_', ' ').toLowerCase()}</span></td>
                        <td className="text-right">{o.items.length}</td>
                        <td className="text-right font-medium">${o.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="sf-card p-4">
            <h2 className="sf-section-title mb-3">Timeline</h2>
            <ol className="space-y-3">
              {user.orders.slice(0, 6).map(o => (
                <li key={o.id} className="flex gap-2.5">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-[#f1f1f1] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#616161]" />
                  </span>
                  <div>
                    <p className="text-[12px] text-[#303030]">
                      Placed order <Link href={`/admin/orders/${o.id}`} className="font-medium text-[#005bd3] hover:underline">{o.orderNumber}</Link> for ${o.total.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-[#8a8a8a]">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
              <li className="flex gap-2.5">
                <span className="mt-0.5 h-6 w-6 rounded-full bg-[#f1f1f1] flex items-center justify-center shrink-0">
                  <Clock className="h-3.5 w-3.5 text-[#616161]" />
                </span>
                <div>
                  <p className="text-[12px] text-[#303030]">Customer account created</p>
                  <p className="text-[11px] text-[#8a8a8a]">{new Date(user.createdAt).toLocaleString()}</p>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="sf-card p-4">
            <h2 className="sf-section-title mb-3">Customer</h2>
            <div className="space-y-1.5 text-[12px]">
              <p className="flex items-center gap-2 text-[#303030]"><Mail className="h-3.5 w-3.5 text-[#8a8a8a]" /> {user.email}</p>
              {user.profile?.phone && <p className="text-[#616161]">{user.profile.phone}</p>}
              <p className="flex items-center gap-2 mt-2">
                <span className={`sf-badge ${user.emailVerified ? 'sf-badge-success' : 'sf-badge-warning'}`}>
                  {user.emailVerified ? 'Email verified' : 'Not verified'}
                </span>
                {optedIn?.isActive && <span className="sf-badge sf-badge-neutral">Subscribed</span>}
              </p>
            </div>
            <div className="sf-divider my-3" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-2 flex items-center gap-1.5"><Tag className="h-3 w-3" /> Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.length ? tags.map(t => (
                <span key={t} className="sf-badge sf-badge-neutral">{t}</span>
              )) : <span className="text-[12px] text-[#8a8a8a]">No tags yet</span>}
            </div>
          </div>

          <div className="sf-card p-4">
            <h2 className="sf-section-title mb-3 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Default address</h2>
            {user.addresses.length === 0 ? (
              <p className="text-[12px] text-[#8a8a8a]">No saved addresses.</p>
            ) : defaultAddress && (
              <div className="text-[12px] text-[#616161] leading-relaxed">
                <p className="font-medium text-[#303030]">{defaultAddress.firstName} {defaultAddress.lastName}</p>
                <p>{defaultAddress.address1}</p>
                {defaultAddress.address2 && <p>{defaultAddress.address2}</p>}
                <p>{defaultAddress.city}{defaultAddress.state ? `, ${defaultAddress.state}` : ''} {defaultAddress.postalCode}</p>
                <p>{defaultAddress.country}</p>
                {defaultAddress.phone && <p className="mt-1">{defaultAddress.phone}</p>}
              </div>
            )}
            {user.addresses.length > 1 && (
              <p className="text-[11px] text-[#8a8a8a] mt-2">{user.addresses.length} addresses on file</p>
            )}
          </div>

          <div className="sf-card p-4">
            <h2 className="sf-section-title mb-2">Last order</h2>
            {lastOrder ? (
              <>
                <Link href={`/admin/orders/${lastOrder.id}`} className="text-[13px] font-medium text-[#005bd3] hover:underline">{lastOrder.orderNumber}</Link>
                <p className="text-[11px] text-[#8a8a8a] mt-0.5">
                  {new Date(lastOrder.createdAt).toLocaleDateString()} · {daysSinceLast} day{daysSinceLast === 1 ? '' : 's'} ago
                </p>
              </>
            ) : (
              <p className="text-[12px] text-[#8a8a8a]">No orders yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
