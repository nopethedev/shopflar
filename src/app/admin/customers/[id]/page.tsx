import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Mail, MapPin, ShoppingBag } from 'lucide-react'

export const dynamic = 'force-dynamic'

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
  const totalSpent = user.orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'FAILED').reduce((s, o) => s + o.total, 0)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/customers"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.profile?.firstName} {user.profile?.lastName}</h1>
          <p className="text-sm text-muted-foreground">Customer since {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Mail className="h-3.5 w-3.5" /> Email</div>
          <p className="text-sm font-medium mt-1 truncate">{user.email}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><ShoppingBag className="h-3.5 w-3.5" /> Orders</div>
          <p className="text-2xl font-bold mt-1">{user.orders.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><ShoppingBag className="h-3.5 w-3.5" /> Total Spent</div>
          <p className="text-2xl font-bold mt-1">${totalSpent.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-background p-5">
          <h2 className="font-semibold mb-4">Orders</h2>
          {user.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {user.orders.map(o => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="block p-3 rounded-md border border-border hover:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${o.total.toFixed(2)}</p>
                      <Badge variant="outline" className="text-[10px]">{o.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="h-4 w-4" /> Addresses</h2>
          {user.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses.</p>
          ) : (
            <div className="space-y-3">
              {user.addresses.map(a => (
                <div key={a.id} className="text-sm text-muted-foreground">
                  {a.isDefault && <Badge className="mb-1">Default</Badge>}
                  <p className="font-medium text-foreground">{a.firstName} {a.lastName}</p>
                  <p>{a.address1}</p>
                  {a.address2 && <p>{a.address2}</p>}
                  <p>{a.city}, {a.state} {a.postalCode}</p>
                  <p>{a.country}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
