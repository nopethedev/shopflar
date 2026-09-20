'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Percent,
  Mail, Truck, Percent as Tax, Settings, Palette, UserCog,
  Plug, CreditCard, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: Tags },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Discounts', href: '/admin/discounts', icon: Percent },
  { label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
  { label: 'Shipping', href: '/admin/shipping', icon: Truck },
  { label: 'Tax Rates', href: '/admin/tax', icon: Tax },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Printify', href: '/admin/printify', icon: Plug },
  { label: 'Appearance', href: '/admin/appearance', icon: Palette },
  { label: 'Store Settings', href: '/admin/settings', icon: Settings },
  { label: 'Users & Admins', href: '/admin/users', icon: UserCog }
]

export function AdminSidebar({ user }) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-background min-h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {active && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
        <br />
        Role: <span className="font-medium">{user.role.replace('_', ' ')}</span>
      </div>
    </aside>
  )
}
