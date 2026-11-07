'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Home, ShoppingBag, Package, Tags, Users, Star, Percent, Mail, Truck, Receipt,
  CreditCard, Plug, Palette, Settings, UserCog, ChevronDown, FileText, Puzzle,
  BarChart3, Layout, Wrench, RefreshCw, Bell, ScrollText, Sparkles, Search,
  Store, Megaphone, LineChart, Boxes, Layers, Wand2, Paintbrush, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { label: string; href: string; icon: any; badge?: string }
type NavGroup = { id: string; label?: string; icon?: any; href?: string; items: NavItem[] }

// Mirrors the Shopify admin information architecture: primary destinations
// first, then expandable groups for catalog, content, growth and settings.
const NAV: NavGroup[] = [
  { id: 'home', items: [{ label: 'Home', href: '/admin', icon: Home }] },
  { id: 'orders', items: [{ label: 'Orders', href: '/admin/orders', icon: ShoppingBag }] },
  {
    id: 'products', label: 'Products', icon: Package, items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: Tags },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
      { label: 'Fulfillment', href: '/admin/fulfillment', icon: Truck }
    ]
  },
  { id: 'customers', items: [{ label: 'Customers', href: '/admin/customers', icon: Users }] },
  {
    id: 'content', label: 'Content', icon: FileText, items: [
      { label: 'Pages', href: '/admin/pages', icon: FileText },
      { label: 'Theme editor', href: '/admin/builder', icon: Layout },
      { label: 'Themes', href: '/admin/themes', icon: Palette },
      { label: 'Navigation & branding', href: '/admin/appearance', icon: Paintbrush }
    ]
  },
  {
    id: 'growth', label: 'Growth', icon: LineChart, items: [
      { label: 'Discounts', href: '/admin/discounts', icon: Percent },
      { label: 'Campaigns', href: '/admin/newsletter', icon: Megaphone },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell }
    ]
  },
  {
    id: 'analytics', label: 'Analytics', icon: BarChart3, items: [
      { label: 'Reports', href: '/admin/logs', icon: BarChart3 },
      { label: 'Activity log', href: '/admin/logs?tab=activity', icon: ScrollText },
      { label: 'Tracking & pixels', href: '/admin/tracking', icon: LineChart }
    ]
  },
  {
    id: 'apps', label: 'Apps', icon: Boxes, items: [
      { label: 'Printify', href: '/admin/printify', icon: Plug },
      { label: 'Plugins', href: '/admin/plugins', icon: Puzzle }
    ]
  },
  {
    id: 'settings', label: 'Settings', icon: Settings, items: [
      { label: 'Store settings', href: '/admin/settings', icon: Settings },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'Shipping', href: '/admin/shipping', icon: Truck },
      { label: 'Taxes', href: '/admin/tax', icon: Receipt },
      { label: 'Business details', href: '/admin/business', icon: Store },
      { label: 'Legal pages', href: '/admin/legal', icon: ShieldCheck },
      { label: 'Email & SMTP', href: '/admin/email', icon: Mail },
      { label: 'Store mode', href: '/admin/store-mode', icon: Wrench },
      { label: 'Users & admins', href: '/admin/users', icon: UserCog },
      { label: 'Updates', href: '/admin/updater', icon: RefreshCw }
    ]
  }
]

const flatNav = NAV.flatMap(g => g.items)
const parentForPath = (pathname: string) =>
  NAV.filter(g => g.label && g.items.some(i => pathname === i.href || (i.href !== '/admin' && pathname.startsWith(i.href.split('?')[0]))))
    .map(g => g.id)

export function AdminSidebar({ user, storeName }) {
  const pathname = usePathname()
  const autoOpen = parentForPath(pathname)
  const [open, setOpen] = useState<string[]>(Array.from(new Set(['products', 'content', 'growth', ...autoOpen])))
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAV
    return NAV
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0)
  }, [query])

  const toggle = (id: string) =>
    setOpen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href.split('?')[0]))

  return (
    <aside className="hidden lg:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 bg-[#1a1a1a] text-[#b5b5b5]">
      {/* Store switcher */}
      <div className="px-3 pt-3 pb-2">
        <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 text-[#0d0d0d] flex items-center justify-center text-sm font-bold shrink-0">
            {(storeName || 'S').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white leading-tight truncate">{storeName || 'My store'}</p>
            <p className="text-[11px] text-[#8a8a8a] leading-tight">Shopflar</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#8a8a8a]" />
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a8a8a]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full h-8 pl-8 pr-2 rounded-lg bg-[#303030] border border-[#3f3f3f] text-[13px] text-white placeholder:text-[#8a8a8a] outline-none focus:border-[#5b5b5b] focus:ring-2 focus:ring-white/10"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 shopify-scroll">
        {/* Assistant callout */}
        <Link
          href="/admin/ai"
          className={cn(
            'flex items-center gap-2.5 mx-1 mb-2 mt-1 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors',
            isActive('/admin/ai')
              ? 'bg-white text-[#1a1a1a]'
              : 'bg-[#232323] text-[#e3e3e3] hover:bg-[#2d2d2d] border border-[#333]'
          )}
        >
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="flex-1">AI Assistant</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300">Beta</span>
        </Link>

        {filtered.map(group => {
          const expanded = query ? true : (group.label ? open.includes(group.id) : true)
          const groupActive = group.items.some(i => isActive(i.href))
          return (
            <div key={group.id} className="mb-0.5">
              {group.label ? (
                <button
                  onClick={() => toggle(group.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors',
                    groupActive ? 'text-white' : 'text-[#b5b5b5] hover:bg-white/5 hover:text-white'
                  )}
                >
                  {group.icon && <group.icon className="h-4 w-4 shrink-0" />}
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded ? '' : '-rotate-90')} />
                </button>
              ) : null}
              {expanded && (
                <div className={cn(group.label ? 'ml-[18px] pl-2 border-l border-[#333] my-0.5' : '')}>
                  {group.items.map(item => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors',
                          active
                            ? 'bg-[#303030] text-white font-semibold'
                            : 'text-[#b5b5b5] hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {!group.label && <item.icon className="h-4 w-4 shrink-0" />}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white">{item.badge}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-[#2e2e2e] p-3">
        <Link href="/admin/settings" className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
          <div className="h-7 w-7 rounded-full bg-[#3a3a3a] text-white flex items-center justify-center text-[11px] font-semibold">
            {(user.email[0] || 'A').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-white truncate">{user.name || user.email}</p>
            <p className="text-[10px] text-[#8a8a8a]">{user.role.replace('_', ' ')}</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}

export { flatNav }
