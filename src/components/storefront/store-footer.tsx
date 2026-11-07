'use client'
import Link from 'next/link'
import { Instagram, Twitter, Facebook, Music2, ArrowRight } from 'lucide-react'
import { NewsletterForm } from './newsletter-form'

export function StoreFooter({ settings }) {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="container-ecom py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand + newsletter */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.storeName} className="h-7 w-auto" />
              ) : (
                <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                  {settings.storeName}
                </span>
              )}
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mt-3">
              {settings.storeDescription || 'Thoughtfully designed goods, made to last. Free shipping over $75 and easy 30-day returns.'}
            </p>

            <div className="mt-6 max-w-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium mb-2">
                {settings.newsletter?.title || 'Join the list'}
              </p>
              <NewsletterForm />
              <p className="text-[11px] text-muted-foreground mt-2">
                Get early access to drops and 10% off your first order.
              </p>
            </div>

            <div className="flex items-center gap-3 mt-6">
              {settings.social.instagram && (
                <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">
                  <Instagram className="h-[18px] w-[18px]" />
                </a>
              )}
              {settings.social.twitter && (
                <a href={settings.social.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                  <Twitter className="h-[18px] w-[18px]" />
                </a>
              )}
              {settings.social.facebook && (
                <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook">
                  <Facebook className="h-[18px] w-[18px]" />
                </a>
              )}
              {settings.social.tiktok && (
                <a href={settings.social.tiktok} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="TikTok">
                  <Music2 className="h-[18px] w-[18px]" />
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            <FooterCol title="Shop" links={[
              { label: 'All products', href: '/products' },
              { label: 'Featured', href: '/products?featured=true' },
              { label: 'New arrivals', href: '/products?new=true' },
              { label: 'Sale', href: '/products?sale=true' }
            ]} />

            <FooterCol title="Support" links={[
              { label: 'Contact us', href: '/contact' },
              { label: 'Shipping', href: '/shipping' },
              { label: 'Returns', href: '/returns' },
              { label: 'Track an order', href: '/account/orders' }
            ]} />

            <FooterCol title="Company" links={[
              { label: 'About us', href: '/about' },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Impressum', href: '/impressum' }
            ]} />

            <FooterCol title="Account" links={[
              { label: 'Sign in', href: '/login' },
              { label: 'Create account', href: '/signup' },
              { label: 'My orders', href: '/account/orders' },
              { label: 'Wishlist', href: '/wishlist' }
            ]} />
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>{settings.footerText || `© ${year} ${settings.storeName}. All rights reserved.`}</p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-7 rounded-sm bg-background border border-border flex items-center justify-center text-[8px] font-semibold text-foreground/60">VISA</span>
              <span className="h-4 w-7 rounded-sm bg-background border border-border flex items-center justify-center text-[7px] font-semibold text-foreground/60">MC</span>
              <span className="h-4 w-7 rounded-sm bg-background border border-border flex items-center justify-center text-[7px] font-semibold text-foreground/60">AMEX</span>
              <span className="h-4 w-7 rounded-sm bg-background border border-border flex items-center justify-center text-[7px] font-semibold text-foreground/60">PP</span>
            </span>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/cookies" className="hover:text-foreground">Cookies</Link>
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-3 text-foreground">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group">
              {l.label}
              <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
