'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, ExternalLink, LogOut, ChevronDown, Search, Bell, CircleHelp, Sparkles, Home
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { flatNav } from './admin-sidebar'
import { cn } from '@/lib/utils'

// Friendly names for breadcrumbs. Falls back to a title-cased path segment.
const LABELS: Record<string, string> = {
  admin: 'Home', products: 'Products', orders: 'Orders', customers: 'Customers',
  categories: 'Categories', discounts: 'Discounts', newsletter: 'Campaigns',
  builder: 'Theme editor', themes: 'Themes', appearance: 'Navigation & branding',
  pages: 'Pages', reviews: 'Reviews', shipping: 'Shipping', tax: 'Taxes',
  payments: 'Payments', fulfillment: 'Fulfillment', printify: 'Printify',
  plugins: 'Plugins', settings: 'Store settings', users: 'Users & admins',
  business: 'Business details', legal: 'Legal pages', email: 'Email & SMTP',
  tracking: 'Tracking & pixels', notifications: 'Notifications', logs: 'Reports',
  'store-mode': 'Store mode', updater: 'Updates', ai: 'AI Assistant', new: 'New'
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href?: string }[] = []
  let acc = ''
  parts.forEach((part, i) => {
    acc += `/${part}`
    if (part === 'admin' && i === 0) {
      crumbs.push({ label: 'Home', href: '/admin' })
      return
    }
    const isId = /^[a-z0-9]{20,}$/i.test(part) || /^\d+$/.test(part)
    crumbs.push({
      label: isId ? 'Details' : (LABELS[part] || part.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())),
      href: i < parts.length - 1 ? acc : undefined
    })
  })
  return crumbs.filter(c => !(crumbs.length === 1 && c.label === 'Home'))
}

export function AdminHeader({ user, storeName }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const crumbs = useBreadcrumbs()

  const submitSearch = (e) => {
    e.preventDefault()
    if (!search.trim()) return
    router.push(`/admin/products?search=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-[#e3e3e3] bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between h-full px-4 md:px-6 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 -ml-2 rounded-md hover:bg-[#f1f1f1]" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 overflow-y-auto bg-[#1a1a1a] text-[#e3e3e3] border-0">
              <SheetHeader className="px-5 py-4 border-b border-white/10">
                <SheetTitle className="text-white text-left">{storeName}</SheetTitle>
              </SheetHeader>
              <nav className="p-2 space-y-0.5">
                {flatNav.map(item => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href.split('?')[0]))
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                          active ? 'bg-white/15 text-white font-semibold' : 'hover:bg-white/5'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <nav className="flex items-center gap-1.5 text-[13px] min-w-0">
            <Link href="/admin" className="p-1.5 rounded-md hover:bg-[#f1f1f1] text-[#616161]" aria-label="Home">
              <Home className="h-4 w-4" />
            </Link>
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#d0d0d0]">/</span>
                {c.href ? (
                  <Link href={c.href} className="truncate text-[#303030] hover:underline">{c.label}</Link>
                ) : (
                  <span className="truncate font-medium text-[#1a1a1a]">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <form onSubmit={submitSearch} className="hidden md:block relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a8a8a]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="h-8 w-56 pl-8 pr-12 rounded-lg bg-[#f1f1f1] border border-transparent text-[13px] placeholder:text-[#8a8a8a] focus:bg-white focus:border-[#c9c9c9] outline-none focus:ring-2 focus:ring-[#005bd3]/20"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8a8a8a] border border-[#d9d9d9] rounded px-1 py-0.5 bg-white">/</kbd>
          </form>

          <Link
            href="/admin/ai"
            className={cn(
              'hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-colors',
              pathname.startsWith('/admin/ai')
                ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                : 'border-[#d9d9d9] text-[#303030] hover:bg-[#f7f7f7]'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </Link>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#d9d9d9] text-[12px] font-medium text-[#303030] hover:bg-[#f7f7f7]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View store
          </Link>

          <Link href="/admin/notifications" className="p-2 rounded-lg hover:bg-[#f1f1f1] text-[#616161]" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Link>
          <Link href="/admin/updater" className="hidden sm:block p-2 rounded-lg hover:bg-[#f1f1f1] text-[#616161]" aria-label="Help">
            <CircleHelp className="h-4 w-4" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-[#f1f1f1]">
              <div className="h-7 w-7 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-[11px] font-semibold">
                {(user.email[0] || 'A').toUpperCase()}
              </div>
              <ChevronDown className="h-3 w-3 text-[#8a8a8a] hidden md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer">Store settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/users" className="cursor-pointer">Manage admins</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action="/api/auth/logout" method="post" className="w-full">
                  <button type="submit" className="flex items-center gap-2 cursor-pointer text-sm">
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
