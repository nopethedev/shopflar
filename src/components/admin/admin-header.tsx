'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, ExternalLink, LogOut, ChevronDown } from 'lucide-react'
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Categories', href: '/admin/categories' },
  { label: 'Customers', href: '/admin/customers' },
  { label: 'Discounts', href: '/admin/discounts' },
  { label: 'Newsletter', href: '/admin/newsletter' },
  { label: 'Shipping', href: '/admin/shipping' },
  { label: 'Tax', href: '/admin/tax' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Printify', href: '/admin/printify' },
  { label: 'Appearance', href: '/admin/appearance' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Users', href: '/admin/users' }
]

export function AdminHeader({ user, storeName }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 -ml-2" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="px-5 py-4 border-b">
                <SheetTitle>{storeName} Admin</SheetTitle>
              </SheetHeader>
              <nav className="p-3 space-y-0.5">
                {navItems.map(item => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/admin" className="font-semibold tracking-tight">
            {storeName} <span className="text-xs font-normal text-muted-foreground ml-1">Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border"
          >
            View Store <ExternalLink className="h-3 w-3" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted">
              <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                {(user.email[0] || 'A').toUpperCase()}
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">{user.role.replace('_', ' ')}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="cursor-pointer">View Store</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/users" className="cursor-pointer">Manage Admins</Link>
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
