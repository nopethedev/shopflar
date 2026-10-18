import Link from 'next/link'
import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { ProductCard } from '@/components/storefront/product-card'
import { NewsletterForm } from '@/components/storefront/newsletter-form'
import { Button } from '@/components/ui/button'
import { ArrowRight, Truck, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [settings, categories, featured, newArrivals, customSections] = await Promise.all([
    getStoreSettings(),
    db.category.findMany({
      where: { isVisible: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: 6,
      include: { children: true }
    }),
    db.product.findMany({
      where: { status: 'PUBLISHED', featured: true },
      include: { images: true, categories: { include: { category: true } }, variants: true, mysteryCrate: true },
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    db.product.findMany({
      where: { status: 'PUBLISHED' },
      include: { images: true, categories: { include: { category: true } }, variants: true, mysteryCrate: true },
      orderBy: { createdAt: 'desc' },
      take: 4
    }),
    db.pageSection.findMany({
      where: { pageType: 'home', isDraft: false, isDeleted: false },
      orderBy: { sortOrder: 'asc' }
    })
  ])

  // If custom sections exist, render those instead of the default layout
  if (customSections.length > 0) {
    const { SectionRenderer } = await import('@/components/storefront/section-renderer')
    return (
      <StorefrontLayout settings={settings} categories={categories}>
        {customSections.map(section => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </StorefrontLayout>
    )
  }

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      {/* ===== Hero ===== */}
      <section className="relative">
        <div className="relative h-[78vh] min-h-[500px] w-full overflow-hidden">
          <img
            src={settings.hero.image}
            alt={settings.hero.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />
          <div className="absolute inset-0 flex items-center">
            <div className="container-ecom">
              <div className="max-w-2xl text-white">
                <p className="text-sm font-medium uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> New Season Drop
                </p>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                  {settings.hero.title}
                </h1>
                <p className="mt-5 text-base sm:text-lg text-white/85 max-w-xl leading-relaxed">
                  {settings.hero.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-white text-black hover:bg-white/90">
                    <Link href={settings.hero.buttonUrl}>
                      {settings.hero.buttonText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white">
                    <Link href="/products?sale=true">Shop the Sale</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Trust badges ===== */}
      <section className="border-b border-border/60">
        <div className="container-ecom py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrustBadge icon={Truck} title="Free shipping" sub="On orders over $75" />
            <TrustBadge icon={RotateCcw} title="30-day returns" sub="Hassle-free returns" />
            <TrustBadge icon={ShieldCheck} title="Secure checkout" sub="Encrypted & protected" />
            <TrustBadge icon={Sparkles} title="Quality first" sub="Made to last" />
          </div>
        </div>
      </section>

      {/* ===== Featured Products ===== */}
      <section className="py-16 md:py-20">
        <div className="container-ecom">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Hand-picked</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                {settings.sections.featuredTitle}
              </h2>
              {settings.sections.featuredSubtitle && (
                <p className="text-muted-foreground mt-2 max-w-xl">{settings.sections.featuredSubtitle}</p>
              )}
            </div>
            <Link href="/products?featured=true" className="hidden md:flex items-center gap-1 text-sm font-medium hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          <div className="mt-10 md:hidden">
            <Button asChild variant="outline" className="w-full">
              <Link href="/products">View all products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== Category showcase ===== */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="container-ecom">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Browse</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              Shop by Category
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map(c => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-card"
              >
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="text-lg font-semibold leading-tight">{c.name}</h3>
                  <p className="text-xs text-white/70 mt-0.5">Shop now →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== New Arrivals ===== */}
      <section className="py-16 md:py-20">
        <div className="container-ecom">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Just In</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                {settings.sections.newArrivalsTitle}
              </h2>
            </div>
            <Link href="/products?new=true" className="hidden md:flex items-center gap-1 text-sm font-medium hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
            {newArrivals.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== Editorial split ===== */}
      <section className="border-t border-border">
        <div className="grid md:grid-cols-2">
          <div className="aspect-square md:aspect-auto md:h-full bg-muted">
            <img
              src="https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1200&auto=format&fit=crop"
              alt="The Spring Collection"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-8 md:p-16 lg:p-20 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Journal</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              Built for the way you actually live.
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-md">
              Every piece in our collection is chosen for quality, fit, and longevity — not trends that fade in a season. We work directly with mills and makers to bring you considered essentials at honest prices.
            </p>
            <div className="mt-8">
              <Button asChild variant="outline">
                <Link href="/about">Read our story</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Newsletter ===== */}
      <section className="bg-foreground text-background py-16 md:py-20">
        <div className="container-ecom max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-3">Newsletter</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {settings.newsletter.title}
          </h2>
          <p className="mt-3 opacity-80">{settings.newsletter.subtitle}</p>
          <NewsletterForm variant="dark" />
          <p className="mt-3 text-xs opacity-60">By subscribing, you agree to our <Link href="/privacy" className="underline">Privacy Policy</Link>. You can unsubscribe at any time.</p>
        </div>
      </section>
    </StorefrontLayout>
  )
}

function TrustBadge({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}
