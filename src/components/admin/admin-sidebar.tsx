'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Users,
  Percent, Mail, Truck, Receipt, CreditCard, Plug,
  Palette, Settings, UserCog, ChevronRight, Star, FileText, Puzzle, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Group items into sections so the sidebar is organized like a real SaaS admin
const sections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Customers', href: '/admin/customers', icon: Users }
    ]
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: Tags },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
      { label: 'Discounts', href: '/admin/discounts', icon: Percent }
    ]
  },
  {
    title: 'Storefront',
    items: [
      { label: 'Pages', href: '/admin/pages', icon: FileText },
      { label: 'Plugins', href: '/admin/plugins', icon: Puzzle },
      { label: 'Newsletter', href: '/admin/newsletter', icon: Mail }
    ]
  },
  {
    title: 'Operations',
    items: [
      { label: 'Shipping', href: '/admin/shipping', icon: Truck },
      { label: 'Tax Rates', href: '/admin/tax', icon: Receipt },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'Printify', href: '/admin/printify', icon: Plug }
    ]
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Appearance', href: '/admin/appearance', icon: Palette },
      { label: 'Business Details', href: '/admin/business', icon: Receipt },
      { label: 'Legal Pages', href: '/admin/legal', icon: FileText },
      { label: 'Tracking & Embeds', href: '/admin/tracking', icon: BarChart3 },
      { label: 'Store Settings', href: '/admin/settings', icon: Settings },
      { label: 'Users & Admins', href: '/admin/users', icon: UserCog }
    ]
  }
]

// Flatten for the mobile menu
const flatNav = sections.flatMap(s => s.items)

export function AdminSidebar({ user }) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-background min-h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 p-3 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-5' : ''}>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      active
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      active ? 'text-background' : 'text-muted-foreground group-hover:text-foreground'
                    )} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
        <br />
        Role: <span className="font-medium">{user.role.replace('_', ' ')}</span>
      </div>
    </aside>
  )
}

export { flatNav }
