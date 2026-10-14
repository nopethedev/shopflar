'use client'
import Link from 'next/link'
import { Instagram, Twitter, Facebook, Music2 } from 'lucide-react'

export function StoreFooter({ settings }) {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="container-ecom py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              {settings.storeName}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{settings.storeDescription}</p>
            <div className="flex items-center gap-3 mt-5">
              {settings.social.instagram && (
                <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings.social.twitter && (
                <a href={settings.social.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {settings.social.facebook && (
                <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings.social.tiktok && (
                <a href={settings.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="TikTok">
                  <Music2 className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <FooterCol title="Shop" links={[
            { label: 'All Products', href: '/products' },
            { label: 'Featured', href: '/products?featured=true' },
            { label: 'New Arrivals', href: '/products?new=true' },
            { label: 'Sale', href: '/products?sale=true' }
          ]} />

          <FooterCol title="Company" links={[
            { label: 'About Us', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Shipping', href: '/shipping' },
            { label: 'Returns', href: '/returns' }
          ]} />

          <FooterCol title="Account" links={[
            { label: 'Sign In', href: '/login' },
            { label: 'Create Account', href: '/signup' },
            { label: 'My Orders', href: '/account/orders' },
            { label: 'Wishlist', href: '/wishlist' }
          ]} />
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{settings.footerText || `© ${year} ${settings.storeName}. All rights reserved.`}</p>
          <p className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-foreground">Cookies</Link>
            <span>·</span>
            <Link href="/returns" className="hover:text-foreground">Returns</Link>
            <span>·</span>
            <Link href="/impressum" className="hover:text-foreground">Impressum</Link>
            <span>·</span>
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
