'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '@/lib/cart-store'
import { useWishlist } from '@/lib/wishlist-store'
import { CartDrawer } from './cart-drawer'
import { SearchCommand } from './search-command'
import {
  Menu, ShoppingBag, Heart, User, Search, X, ChevronRight
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogTrigger
} from '@/components/ui/dialog'
import { useSession } from './session-provider'

export function StoreHeader({ settings, categories }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const cartOpen = useCart(s => s.isOpen)
  const setCartOpen = useCart(s => s.setOpen)
  const cartCount = useCart(s => s.items.reduce((n, it) => n + it.quantity, 0))
  const wishlistCount = useWishlist(s => s.ids.length)
  const { user } = useSession()

  const nav = [
    { label: 'Shop All', href: '/products' },
    ...categories.filter(c => !c.parentId).slice(0, 5).map(c => ({ label: c.name, href: `/categories/${c.slug}` })),
    { label: 'Sale', href: '/products?sale=true' }
  ]

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container-ecom">
          <div className="flex h-16 items-center gap-4">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden -ml-2" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
                <SheetHeader className="px-5 pt-5 pb-3 border-b">
                  <SheetTitle className="text-left">{settings.storeName}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col px-2 py-3">
                  {nav.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
                    >
                      {item.label}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </nav>
                <div className="border-t mt-2 px-5 py-4 space-y-1">
                  {user ? (
                    <>
                      <Link href="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md">
                        <User className="h-4 w-4" /> My Account
                      </Link>
                      <Link href="/account/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md">
                        <ShoppingBag className="h-4 w-4" /> Orders
                      </Link>
                    </>
                  ) : (
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md">
                      <User className="h-4 w-4" /> Sign In
                    </Link>
                  )}
                  <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-md">
                    <Heart className="h-4 w-4" /> Wishlist
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.storeName} className="h-7 w-auto" />
              ) : (
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                  {settings.storeName}
                </span>
              )}
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {nav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              {/* Search */}
              <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Search">
                    <Search className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 gap-0 max-w-2xl top-[20%] translate-y-0 left-1/2 -translate-x-1/2">
                  <SearchCommand onSelect={() => setSearchOpen(false)} categories={categories} />
                </DialogContent>
              </Dialog>

              {/* Wishlist */}
              <Link href="/wishlist" className="hidden sm:flex" aria-label="Wishlist">
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[10px] font-semibold flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Account */}
              <Link href={user ? '/account' : '/login'} aria-label="Account">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>

              {/* Cart */}
              <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(!cartOpen)} aria-label="Cart">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[10px] font-semibold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  )
}
