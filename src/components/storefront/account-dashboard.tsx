'use client'
import Link from 'next/link'
import { useState } from 'react'
import { User, ShoppingBag, MapPin, Heart, Settings, LogOut, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'

export function AccountDashboard({ user, orders, addresses, wishlistItems }) {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const initials = (user.profile?.firstName?.[0] || user.email[0] || 'U').toUpperCase()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    router.push('/')
    router.refresh()
  }

  const nav = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-8">
      <aside>
        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {user.profile?.firstName ? `${user.profile.firstName} ${user.profile?.lastName || ''}` : user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <nav className="mt-4 space-y-1">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                tab === item.id ? 'bg-foreground text-background' : 'hover:bg-muted'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium hover:bg-muted text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      </aside>

      <div className="min-w-0">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                Welcome back{user.profile?.firstName ? `, ${user.profile.firstName}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your account.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard label="Total Orders" value={orders.length} icon={ShoppingBag} />
              <StatCard label="Wishlist Items" value={wishlistItems.length} icon={Heart} />
              <StatCard label="Saved Addresses" value={addresses.length} icon={MapPin} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Recent Orders</h2>
                <Button variant="ghost" size="sm" onClick={() => setTab('orders')}>View all</Button>
              </div>
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/products">Start shopping</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 3).map(o => <OrderRow key={o.id} order={o} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>My Orders</h1>
            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/products">Start shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map(o => <OrderRow key={o.id} order={o} expanded />)}
              </div>
            )}
          </div>
        )}

        {tab === 'addresses' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Addresses</h1>
            {addresses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {addresses.map(a => (
                  <div key={a.id} className="rounded-lg border border-border p-4">
                    {a.isDefault && <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mb-2 inline-block">Default</span>}
                    <p className="text-sm font-medium">{a.firstName} {a.lastName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{a.address1}</p>
                    {a.address2 && <p className="text-sm text-muted-foreground">{a.address2}</p>}
                    <p className="text-sm text-muted-foreground">{a.city}, {a.state} {a.postalCode}</p>
                    <p className="text-sm text-muted-foreground">{a.country}</p>
                    {a.phone && <p className="text-sm text-muted-foreground mt-1">{a.phone}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'wishlist' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Wishlist</h1>
            {wishlistItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/products">Browse products</Link>
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {wishlistItems.map(p => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group">
                    <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                      {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                    <p className="text-sm font-medium mt-2 line-clamp-2">{p.name}</p>
                    <p className="text-sm font-semibold">${p.price.toFixed(2)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Account Settings</h1>
            <form className="max-w-md space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success('Profile updated') }}>
              <div>
                <label className="text-xs font-medium mb-1.5 block">First Name</label>
                <input defaultValue={user.profile?.firstName || ''} className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Last Name</label>
                <input defaultValue={user.profile?.lastName || ''} className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Email</label>
                <input defaultValue={user.email} disabled className="h-10 w-full px-3 rounded-md border border-input bg-muted text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Phone</label>
                <input defaultValue={user.profile?.phone || ''} className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  )
}

function OrderRow({ order, expanded }) {
  const statusColor = {
    PENDING: 'bg-amber-100 text-amber-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
    REFUNDED: 'bg-rose-100 text-rose-700',
    FAILED: 'bg-rose-100 text-rose-700'
  }
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${statusColor[order.status] || 'bg-muted text-muted-foreground'}`}>
            {order.status.replace('_', ' ')}
          </span>
          <p className="font-semibold text-sm">${order.total.toFixed(2)}</p>
        </div>
      </div>
      {expanded && order.items && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {order.items.map(it => (
            <div key={it.id} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                {it.imageUrl && <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />}
              </div>
              <p className="text-sm flex-1 truncate">{it.name}{it.variantName && <span className="text-muted-foreground"> · {it.variantName}</span>}</p>
              <p className="text-xs text-muted-foreground">×{it.quantity}</p>
              <p className="text-sm font-medium">${(it.price * it.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
