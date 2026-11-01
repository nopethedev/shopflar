// Storefront section renderer — turns PageSection rows into real UI.
// Every section supports a `design` config (background, text color, padding,
// width) applied by SectionShell, so all sections get Shopify-style design
// controls without touching their internals.
import { db } from '@/lib/db'
import { ProductCard } from './product-card'
import { NewsletterForm } from './newsletter-form'
import { ContactForm } from './contact-form'
import { SlideshowSection, CountdownSection } from './section-client'
import { scopeSectionCss } from '@/lib/section-css'
import { contentPositionClasses, overlayStyleFor } from '@/lib/section-style'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star, ChevronDown, ShieldCheck, Truck, RotateCcw } from 'lucide-react'

// Re-exported for the builder preview
export { contentPositionClasses, overlayStyleFor }

// Padding presets (px) — mirrored by the builder preview
export const PADDING_Y = { none: 0, sm: 24, md: 56, lg: 80, xl: 120 }

// Full-bleed sections that must NOT get the default vertical padding
const PADDING_DEFAULTS = {
  hero: 'none',
  slideshow: 'none',
  'announcement-bar': 'none',
  marquee: 'none',
  newsletter: 'lg'
}

// 9-way content position (Shopify-style "Position: Bottom center") with
// backward compatibility for the old left/center/right values —
// implementation lives in @/lib/section-style (shared with client components)

// Overlay style from the opacity slider (0-90). Falls back to the classic
// gradient when the slider was never used.

export async function SectionRenderer({ section }) {
  if (!section.isVisible) return null
  let config = section.config
  if (typeof config === 'string') {
    try { config = JSON.parse(config) } catch { config = {} }
  }
  const design = { paddingY: PADDING_DEFAULTS[section.sectionType], ...(config.design || {}) }
  const body = await renderBody(section.sectionType, config)
  if (!body) return null
  return (
    <SectionShell design={design} secId={section.id} customCss={config.design?.customCss || config.customCss}>
      {body}
    </SectionShell>
  )
}

// Universal design wrapper — background, text color, spacing, width, custom CSS
export function SectionShell({ design, secId, customCss, children }) {
  const style = {
    ...(design.bg ? { backgroundColor: design.bg } : {}),
    ...(design.textColor ? { color: design.textColor } : {}),
    '--sec-pt': `${PADDING_Y[design.paddingY] ?? 56}px`,
    '--sec-pb': `${PADDING_Y[design.paddingY] ?? 56}px`,
    ...(design.maxWidth ? { '--sec-max': design.maxWidth === 'wide' ? '96rem' : design.maxWidth === 'narrow' ? '56rem' : design.maxWidth === 'full' ? '100%' : '80rem' } : {})
  }
  const scopedCss = customCss && secId ? scopeSectionCss(customCss, `[data-sec="${secId}"]`) : ''
  return (
    <section className="sec-wrap" style={style} data-sec={secId || undefined}>
      {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}
      {children}
    </section>
  )
}

async function renderBody(type, config) {
  switch (type) {
    case 'hero': return <HeroSection config={config} />
    case 'product-grid': return <ProductGridSection config={config} />
    case 'marquee': return <MarqueeSection config={config} />
    case 'text': return <TextSection config={config} />
    case 'image': return <ImageSection config={config} />
    case 'newsletter': return <NewsletterSection config={config} />
    case 'discounts': return <DiscountsSection config={config} />
    case 'custom-html': return <CustomHtmlSection config={config} />
    case 'announcement-bar': return <AnnouncementBarSection config={config} />
    case 'image-text': return <ImageTextSection config={config} />
    case 'testimonials': return <TestimonialsSection config={config} />
    case 'faq': return <FaqSection config={config} />
    case 'video': return <VideoSection config={config} />
    case 'rich-text': return <RichTextSection config={config} />
    // ===== New sections =====
    case 'slideshow': return <SlideshowSection config={config} />
    case 'cta': return <CtaSection config={config} />
    case 'stats': return <StatsSection config={config} />
    case 'countdown': return <CountdownSection config={config} />
    case 'logo-cloud': return <LogoCloudSection config={config} />
    case 'contact': return <ContactSection config={config} />
    default: return null
  }
}

function HeroSection({ config }) {
  const height = config.height || '60vh'
  const heightMobile = config.heightMobile || height
  const titleSize = { small: '36px', medium: '44px', large: '56px', xlarge: '68px' }[config.titleSize] || '56px'
  const titleSizeMobile = { small: '28px', medium: '34px', large: '40px', xlarge: '48px' }[config.titleSize] || '40px'
  const dark = config.overlay !== 'light'
  const overlayStyle = overlayStyleFor(config)
  return (
    <section className="relative">
      <div
        className="sec-hero relative w-full overflow-hidden"
        style={{ '--hero-h': height, '--hero-h-mobile': heightMobile }}
      >
        {config.image && (
          <img src={config.image} alt={config.title || ''} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div
          className={`absolute inset-0 ${overlayStyle ? '' : dark ? 'bg-gradient-to-b from-black/30 via-black/40 to-black/60' : 'bg-gradient-to-b from-white/30 via-white/40 to-white/60'}`}
          style={overlayStyle || undefined}
        />
        <div className={`absolute inset-0 flex ${contentPositionClasses(config.contentPosition).className}`}>
          <div className="container-ecom">
            <div className={`max-w-2xl ${dark ? 'text-white' : 'text-foreground'}`}>
              {config.title && (
                <h1
                  className="sec-hero-title font-bold leading-[1.05] tracking-tight"
                  style={{ fontFamily: 'var(--font-display), Inter, sans-serif', '--hero-title-size': titleSize, '--hero-title-mobile': titleSizeMobile }}
                >
                  {config.title}
                </h1>
              )}
              {config.subtitle && (
                <p className="mt-5 text-base md:text-lg opacity-85 max-w-xl leading-relaxed">{config.subtitle}</p>
              )}
              {config.buttonText && (
                <Button asChild size="lg" className={`mt-8 ${dark ? 'bg-white text-black hover:bg-white/90' : ''}`}>
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
  const where = { status: 'PUBLISHED' }
  if (config.source === 'featured') where.featured = true
  if (config.source === 'sale') where.compareAtPrice = { gt: 0 }
  if (config.categoryId) where.categories = { some: { categoryId: config.categoryId } }

  const products = await db.product.findMany({
    where,
    include: {
      images: { take: 2, orderBy: { sortOrder: 'asc' } },
      categories: { include: { category: true } },
      variants: true,
      mysteryCrate: true
    },
    orderBy: { createdAt: 'desc' },
    take: config.limit || 8
  })

  if (products.length === 0) return null

  const colsDesktop = Math.min(6, Math.max(2, parseInt(config.columnsDesktop) || 4))
  const colsMobile = Math.min(3, Math.max(1, parseInt(config.columnsMobile) || 2))
  const align = config.align === 'left' ? 'text-left' : config.align === 'center' ? 'text-center' : ''

  return (
    <section>
      <div className="container-ecom">
        {config.title && (
          <h2 className={`text-2xl md:text-3xl font-bold tracking-tight mb-6 ${align}`} style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div
          className="sec-grid gap-x-4 gap-y-8 md:gap-x-6"
          style={{ '--grid-cols': colsDesktop, '--grid-cols-mobile': colsMobile }}
        >
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {config.buttonText && (
          <div className={`mt-8 ${config.align === 'center' ? 'text-center' : ''}`}>
            <Button asChild variant="outline">
              <Link href={config.buttonUrl || '/products'}>{config.buttonText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

function MarqueeSection({ config }) {
  const speedClass = config.speed === 'slow' ? 'marquee-slow'
    : config.speed === 'fast' ? 'marquee-fast'
    : 'marquee-normal'
  return (
    <section className="py-3 overflow-hidden" style={{ backgroundColor: config.bg || '#1a1a1a' }}>
      <div className={`flex whitespace-nowrap ${speedClass}`}>
        <span className="text-sm font-medium px-4" style={{ color: config.color || '#ffffff' }}>{config.text} • {config.text}</span>
        <span className="text-sm font-medium px-4" style={{ color: config.color || '#ffffff' }} aria-hidden="true">{config.text} • {config.text}</span>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
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
    <section>
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
    <section>
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
    <section className="bg-foreground text-background">
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
  const discounts = await db.discount.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 6 })
  if (discounts.length === 0) return null
  return (
    <section>
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
              <button
                onClick={() => navigator.clipboard.writeText(d.code)}
                className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:bg-foreground/90"
              >Copy</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CustomHtmlSection({ config }) {
  if (!config.html) return null
  return (
    <section>
      <div className="container-ecom" dangerouslySetInnerHTML={{ __html: config.html }} />
    </section>
  )
}

function AnnouncementBarSection({ config }) {
  return (
    <section className="py-2 overflow-hidden" style={{ backgroundColor: config.bg || '#1a1a1a' }}>
      <div className="container-ecom text-center">
        <p className="text-xs font-medium" style={{ color: config.color || '#ffffff' }}>
          {config.text || 'Free shipping on all orders over $50!'}
        </p>
      </div>
    </section>
  )
}

function ImageTextSection({ config }) {
  const isReversed = config.layout === 'image-right'
  return (
    <section>
      <div className="container-ecom">
        <div className={`grid md:grid-cols-2 gap-8 items-center ${isReversed ? 'md:flex-row-reverse' : ''}`}>
          <div className={isReversed ? 'md:order-2' : ''}>
            {config.image && (
              <img src={config.image} alt={config.title || ''} className="w-full rounded-lg object-cover aspect-[4/3]" />
            )}
          </div>
          <div className={isReversed ? 'md:order-1' : ''}>
            {config.title && (
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                {config.title}
              </h2>
            )}
            {config.body && (
              <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: config.body }} />
            )}
            {config.buttonText && (
              <Button asChild className="mt-4">
                <Link href={config.buttonUrl || '/products'}>
                  {config.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({ config }) {
  const testimonials = config.items || []
  if (testimonials.length === 0) return null
  return (
    <section>
      <div className="container-ecom">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-background rounded-lg p-6 border border-border">
              <div className="flex mb-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-4 w-4 ${j < (t.rating || 5) ? 'fill-amber-500 text-amber-500' : 'text-muted'}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-3">&ldquo;{t.text}&rdquo;</p>
              <p className="text-sm font-medium">{t.author}</p>
              {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqSection({ config }) {
  const faqs = config.items || []
  if (faqs.length === 0) return null
  return (
    <section>
      <div className="container-ecom max-w-3xl">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <details key={i} className="group border border-border rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 font-medium text-sm">
                {faq.question}
                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function VideoSection({ config }) {
  if (!config.videoUrl) return null
  // Extract YouTube/Vimeo embed URL
  let embedUrl = config.videoUrl
  if (config.videoUrl.includes('youtube.com/watch?v=')) {
    const videoId = config.videoUrl.split('v=')[1]?.split('&')[0]
    embedUrl = `https://www.youtube.com/embed/${videoId}`
  } else if (config.videoUrl.includes('youtu.be/')) {
    const videoId = config.videoUrl.split('youtu.be/')[1]?.split('?')[0]
    embedUrl = `https://www.youtube.com/embed/${videoId}`
  } else if (config.videoUrl.includes('vimeo.com/')) {
    const videoId = config.videoUrl.split('vimeo.com/')[1]?.split('?')[0]
    embedUrl = `https://player.vimeo.com/video/${videoId}`
  }
  return (
    <section>
      <div className="container-ecom max-w-4xl">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 text-center" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={config.title || 'Video'}
          />
        </div>
      </div>
    </section>
  )
}

function RichTextSection({ config }) {
  return (
    <section>
      <div className="container-ecom max-w-3xl">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        {config.content && (
          <div className="prose prose-lg max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: config.content }} />
        )}
      </div>
    </section>
  )
}

// ============ NEW SECTION TYPES ============

function CtaSection({ config }) {
  const bg = config.bg || '#1a1a1a'
  const color = config.color || '#ffffff'
  return (
    <section>
      <div className="container-ecom">
        <div className="rounded-2xl px-6 py-12 md:py-16 text-center" style={{ backgroundColor: bg, color }}>
          {config.eyebrow && <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-3">{config.eyebrow}</p>}
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title || 'Ready when you are'}
          </h2>
          {config.subtitle && <p className="mt-3 opacity-80 max-w-xl mx-auto">{config.subtitle}</p>}
          {config.buttonText && (
            <Button asChild size="lg" className="mt-7" style={{ backgroundColor: color, color: bg }}>
              <Link href={config.buttonUrl || '/products'}>{config.buttonText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

function StatsSection({ config }) {
  const items = (config.items || []).filter(i => i.value || i.label)
  if (items.length === 0) return null
  return (
    <section>
      <div className="container-ecom">
        {config.title && (
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8 text-center" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
            {config.title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {items.map((s, i) => (
            <div key={i}>
              <p className="text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif', color: config.valueColor || undefined }}>
                {s.value}
              </p>
              {s.label && <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LogoCloudSection({ config }) {
  const items = (config.items || []).filter(i => i.image || i.name)
  if (items.length === 0) return null
  return (
    <section>
      <div className="container-ecom">
        {config.title && (
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">{config.title}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {items.map((l, i) => (
            <Link key={i} href={l.link || '#'} className="opacity-60 hover:opacity-100 transition-opacity" title={l.name}>
              {l.image
                ? <img src={l.image} alt={l.name || ''} className="h-10 w-auto object-contain grayscale" />
                : <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>{l.name}</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection({ config }) {
  return (
    <section>
      <div className="container-ecom max-w-3xl">
        <div className="text-center mb-8">
          {config.title && (
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              {config.title}
            </h2>
          )}
          {config.subtitle && <p className="mt-2 text-muted-foreground">{config.subtitle}</p>}
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
          <ContactForm email={config.email || ''} />
          <div className="space-y-4 text-sm text-muted-foreground md:w-56">
            {config.email && (
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                <div><p className="font-medium text-foreground">Email</p><p>{config.email}</p></div>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <Truck className="h-4 w-4 mt-0.5 shrink-0" />
              <div><p className="font-medium text-foreground">Fast replies</p><p>We usually answer within one business day.</p></div>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="h-4 w-4 mt-0.5 shrink-0" />
              <div><p className="font-medium text-foreground">Easy returns</p><p>30-day return window on all orders.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
