import { db } from '@/lib/db'
import { ProductCard } from './product-card'
import { NewsletterForm } from './newsletter-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export async function SectionRenderer({ section }) {
  if (!section.isVisible) return null
  const config = typeof section.config === 'string' ? JSON.parse(section.config) : section.config

  switch (section.sectionType) {
    case 'hero':
      return <HeroSection config={config} />
    case 'product-grid':
      return <ProductGridSection config={config} />
    case 'marquee':
      return <MarqueeSection config={config} />
    case 'text':
      return <TextSection config={config} />
    case 'image':
      return <ImageSection config={config} />
    case 'newsletter':
      return <NewsletterSection config={config} />
    case 'discounts':
      return <DiscountsSection config={config} />
    case 'custom-html':
      return <CustomHtmlSection config={config} />
    default:
      return null
  }
}

function HeroSection({ config }) {
  return (
    <section className="relative">
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        {config.image && (
          <img src={config.image} alt={config.title || ''} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className={`absolute inset-0 ${config.overlay === 'dark' ? 'bg-gradient-to-b from-black/30 via-black/40 to-black/60' : 'bg-gradient-to-b from-white/30 via-white/40 to-white/60'}`} />
        <div className="absolute inset-0 flex items-center">
          <div className="container-ecom">
            <div className={`max-w-2xl ${config.overlay === 'dark' ? 'text-white' : 'text-foreground'}`}>
              {config.title && (
                <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                  {config.title}
                </h1>
              )}
              {config.subtitle && (
                <p className="mt-5 text-base md:text-lg opacity-85 max-w-xl">{config.subtitle}</p>
              )}
              {config.buttonText && (
                <Button asChild size="lg" className={`mt-8 ${config.overlay === 'dark' ? 'bg-white text-black hover:bg-white/90' : ''}`}>
                  <Link href={config.buttonUrl || '/products'}>
                    {config.buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

async function ProductGridSection({ config }) {
  let products = []
  const where = { status: 'PUBLISHED' }
  if (config.source === 'featured') where.featured = true
  if (config.source === 'sale') where.compareAtPrice = { gt: 0 }

  products = await db.product.findMany({
    where,
    include: {
      images: { take: 2, orderBy: { sortOrder: 'asc' } },
      categories: { include: { category: true } },
      variants: true,
      mysteryCrate: true
    },
    orderBy: config.source === 'new' ? { createdAt: 'desc' } : { createdAt: 'desc' },
    take: config.limit || 8
  })

  if (products.length === 0) return null

  return (
    <section className="py-12 md:py-16">
      <div className="container-ecom">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function MarqueeSection({ config }) {
  const speedClass = config.speed === 'slow' ? 'marquee-slow'
    : config.speed === 'fast' ? 'marquee-fast'
    : 'marquee-normal'

  return (
    <section
      className="py-3 overflow-hidden"
      style={{ backgroundColor: config.bg || '#1a1a1a' }}
    >
      <div className={`flex whitespace-nowrap ${speedClass}`}>
        <span
          className="text-sm font-medium px-4"
          style={{ color: config.color || '#ffffff' }}
        >
          {config.text} • {config.text}
        </span>
        <span
          className="text-sm font-medium px-4"
          style={{ color: config.color || '#ffffff' }}
          aria-hidden="true"
        >
          {config.text} • {config.text}
        </span>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-slow { animation: marquee 30s linear infinite; }
        .marquee-normal { animation: marquee 20s linear infinite; }
        .marquee-fast { animation: marquee 10s linear infinite; }
      `}} />
    </section>
  )
}

function TextSection({ config }) {
  const align = config.align === 'left' ? 'text-left' : config.align === 'right' ? 'text-right' : 'text-center'
  return (
    <section className="py-12 md:py-16">
      <div className={`container-ecom max-w-3xl ${align}`}>
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        {config.body && (
          <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: config.body }} />
        )}
      </div>
    </section>
  )
}

function ImageSection({ config }) {
  if (!config.url) return null
  return (
    <section className="py-8">
      <div className="container-ecom">
        {config.link ? (
          <Link href={config.link}>
            <img src={config.url} alt={config.alt || ''} className="w-full rounded-lg object-cover" />
          </Link>
        ) : (
          <img src={config.url} alt={config.alt || ''} className="w-full rounded-lg object-cover" />
        )}
      </div>
    </section>
  )
}

function NewsletterSection({ config }) {
  return (
    <section className="bg-foreground text-background py-16 md:py-20">
      <div className="container-ecom max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-3">Newsletter</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          {config.title || 'Get 10% off your first order'}
        </h2>
        <p className="mt-3 opacity-80">{config.subtitle || 'Subscribe to our newsletter'}</p>
        <NewsletterForm variant="dark" />
        <p className="mt-3 text-xs opacity-60">By subscribing, you agree to our <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
      </div>
    </section>
  )
}

async function DiscountsSection({ config }) {
  const discounts = await db.discount.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 6
  })

  if (discounts.length === 0) return null

  return (
    <section className="py-12 md:py-16">
      <div className="container-ecom max-w-3xl">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {discounts.map(d => (
            <div key={d.id} className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-foreground/30 bg-muted/20">
              <div>
                <p className="font-mono font-bold text-lg">{d.code}</p>
                <p className="text-xs text-muted-foreground">
                  {d.type === 'PERCENTAGE' ? `${d.value}% off` : d.type === 'FIXED_AMOUNT' ? `$${d.value} off` : 'Free shipping'}
                  {d.minOrderAmount ? ` · min $${d.minOrderAmount}` : ''}
                </p>
              </div>
              <CopyButton code={d.code} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CopyButton({ code }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code)
      }}
      className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:bg-foreground/90"
    >
      Copy
    </button>
  )
}

function CustomHtmlSection({ config }) {
  if (!config.html) return null
  return (
    <section className="py-8">
      <div className="container-ecom" dangerouslySetInnerHTML={{ __html: config.html }} />
    </section>
  )
}
