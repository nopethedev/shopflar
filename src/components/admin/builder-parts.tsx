'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { FileUpload } from '@/components/shared/file-upload'
import { contentPositionClasses, overlayStyleFor } from '@/lib/section-style'
import { THEMES as THEME_PRESETS } from '@/lib/themes'
import { scopeSectionCss } from '@/lib/section-css'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Image as ImageIcon, Type, Mail, Gift, Layout, Scroll, Grid3x3, Code,
  GripVertical, Monitor, Smartphone, Tablet, X, Settings2, Copy,
  RotateCcw, Undo2, Redo2, Upload, Megaphone, Columns, MessageSquare, HelpCircle, Video,
  Star, Play, Palette, Search, Sparkles, Timer, BarChart3, Building2,
  MessageCircle, Layers, ExternalLink, Paintbrush, ChevronDown
} from 'lucide-react'

// ============================================================
// Section catalog — grouped for the palette
// ============================================================
export const SECTION_CATALOG = [
  { type: 'hero', label: 'Hero Banner', group: 'Essentials', icon: Layout, description: 'Large image with title, subtitle, and CTA button' },
  { type: 'announcement-bar', label: 'Announcement Bar', group: 'Essentials', icon: Megaphone, description: 'Thin bar at the top with a message' },
  { type: 'text', label: 'Text Block', group: 'Essentials', icon: Type, description: 'Heading + paragraph of custom text' },
  { type: 'rich-text', label: 'Rich Text', group: 'Essentials', icon: Type, description: 'Long-form text content with HTML formatting' },
  { type: 'image', label: 'Image', group: 'Media', icon: ImageIcon, description: 'Single image with optional link' },
  { type: 'image-text', label: 'Image + Text', group: 'Media', icon: Columns, description: 'Side-by-side image and text with CTA' },
  { type: 'slideshow', label: 'Slideshow', group: 'Media', icon: Play, description: 'Auto-rotating slides with captions and CTAs' },
  { type: 'video', label: 'Video', group: 'Media', icon: Video, description: 'YouTube/Vimeo embed or self-hosted video' },
  { type: 'product-grid', label: 'Product Grid', group: 'Products', icon: Grid3x3, description: 'Show featured, new, or filtered products' },
  { type: 'discounts', label: 'Discount Codes', group: 'Products', icon: Gift, description: 'Show active discount codes customers can copy' },
  { type: 'countdown', label: 'Countdown Timer', group: 'Marketing', icon: Timer, description: 'Urgency timer for sales and launches' },
  { type: 'cta', label: 'CTA Banner', group: 'Marketing', icon: Megaphone, description: 'Bold colored banner with a call to action' },
  { type: 'marquee', label: 'Marquee', group: 'Marketing', icon: Scroll, description: 'Scrolling text banner for announcements' },
  { type: 'newsletter', label: 'Newsletter Signup', group: 'Marketing', icon: Mail, description: 'Email subscribe form with prompt text' },
  { type: 'testimonials', label: 'Testimonials', group: 'Social proof', icon: MessageSquare, description: 'Customer reviews with star ratings' },
  { type: 'stats', label: 'Stats / Numbers', group: 'Social proof', icon: BarChart3, description: 'Big numbers row — customers, rating, shipping' },
  { type: 'logo-cloud', label: 'Logo Cloud', group: 'Social proof', icon: Building2, description: 'Partner or press logos in a row' },
  { type: 'faq', label: 'FAQ', group: 'Support', icon: HelpCircle, description: 'Collapsible questions and answers' },
  { type: 'contact', label: 'Contact Form', group: 'Support', icon: MessageCircle, description: 'Contact form with your store email' },
  { type: 'custom-html', label: 'Custom HTML', group: 'Advanced', icon: Code, description: 'Raw HTML code block' }
]

export const GROUPS = ['Essentials', 'Products', 'Media', 'Marketing', 'Social proof', 'Support', 'Advanced']
const PADDING_Y = { none: 0, sm: 24, md: 56, lg: 80, xl: 120 }
const PADDING_DEFAULTS = { hero: 'none', slideshow: 'none', 'announcement-bar': 'none', marquee: 'none', newsletter: 'lg' }

// Shopify-style 9-way position picker
const POSITION_OPTIONS = [
  ['top-left', 'Top left'], ['top-center', 'Top center'], ['top-right', 'Top right'],
  ['middle-left', 'Middle left'], ['middle-center', 'Middle center'], ['middle-right', 'Middle right'],
  ['bottom-left', 'Bottom left'], ['bottom-center', 'Bottom center'], ['bottom-right', 'Bottom right']
]

// ============================================================
// Default configs
// ============================================================
export function defaultConfig(type) {
  const defaults = {
    hero: { title: 'New Season Drop', subtitle: 'Add your subtitle here', buttonText: 'Shop Now', buttonUrl: '/products', image: '', overlay: 'dark', overlayOpacity: 40, height: '60vh', heightMobile: '48vh', titleSize: 'large', contentPosition: 'middle-left' },
    'announcement-bar': { text: 'Free shipping on all orders over $50!', bg: '#1a1a1a', color: '#ffffff' },
    'product-grid': { title: 'Products', source: 'featured', limit: 8, categoryId: '', columnsDesktop: 4, columnsMobile: 2, buttonText: '', buttonUrl: '/products' },
    'image-text': { title: 'Section Title', body: '<p>Add your text here.</p>', image: '', buttonText: 'Learn More', buttonUrl: '/products', layout: 'image-left' },
    marquee: { text: '🔥 Sale now on • Free shipping over $75 • New arrivals weekly 🔥', speed: 'normal', bg: '#1a1a1a', color: '#ffffff' },
    text: { title: 'Section Title', body: 'Add your text here. HTML is supported.', align: 'center' },
    image: { url: '', alt: '', link: '' },
    'rich-text': { title: '', content: '<p>Your rich text content here. HTML supported.</p>' },
    testimonials: { title: 'What Our Customers Say', items: [{ author: 'Jane D.', role: 'Verified Buyer', rating: 5, text: 'Amazing quality and fast shipping!' }, { author: 'John S.', role: 'Verified Buyer', rating: 5, text: 'Best purchase I\'ve made this year.' }] },
    faq: { title: 'Frequently Asked Questions', items: [{ question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days.' }, { question: 'What is your return policy?', answer: 'We accept returns within 30 days of delivery.' }] },
    newsletter: { title: 'Get 10% off your first order', subtitle: 'Subscribe to our newsletter' },
    discounts: { title: 'Active Discount Codes' },
    video: { title: '', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    slideshow: { autoplay: true, interval: 5, overlay: 'dark', overlayOpacity: 40, height: '70vh', heightMobile: '50vh', contentPosition: 'middle-left', slides: [
      { image: '', eyebrow: 'New in', title: 'First slide headline', subtitle: 'Describe the collection in one line.', buttonText: 'Shop now', buttonUrl: '/products' },
      { image: '', eyebrow: 'Bestsellers', title: 'Second slide headline', subtitle: 'Your bestsellers, back in stock.', buttonText: 'Browse', buttonUrl: '/products' }
    ] },
    countdown: { eyebrow: 'Limited time', title: 'Sale ends soon', endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), buttonText: 'Shop the sale', buttonUrl: '/products', bg: '#1a1a1a', color: '#ffffff' },
    cta: { eyebrow: 'Limited time', title: 'Get 20% off everything', subtitle: 'Use code HELLO20 at checkout — this week only.', buttonText: 'Shop now', buttonUrl: '/products', bg: '#1a1a1a', color: '#ffffff' },
    stats: { items: [{ value: '10k+', label: 'Happy customers' }, { value: '4.9★', label: 'Average rating' }, { value: '48h', label: 'Fast shipping' }, { value: '30d', label: 'Easy returns' }] },
    'logo-cloud': { title: 'As seen in', items: [{ name: 'VOGUE', link: '' }, { name: 'GQ', link: '' }, { name: 'HYPEBEAST', link: '' }, { name: 'ESQUIRE', link: '' }] },
    contact: { title: 'Get in touch', subtitle: 'Questions about an order, sizing, or returns? Send us a message.', email: '' },
    'custom-html': { html: '<div>\n  <p>Your custom HTML here.</p>\n</div>' }
  }
  return JSON.parse(JSON.stringify(defaults[type] || {}))
}

// ============================================================
// Theme presets
// ============================================================
// Shared with the theme library page — 24 full theme presets.
// (imported below)

// ============================================================
// Starter templates — one click fills the homepage
// ============================================================
export const TEMPLATES = [
  { id: 'starter', name: 'Starter Store', desc: 'Hero → products → story → reviews → newsletter', sections: ['hero', 'product-grid', 'image-text', 'testimonials', 'newsletter'] },
  { id: 'launch', name: 'Product Launch', desc: 'Urgency-focused launch page', sections: ['announcement-bar', 'countdown', 'slideshow', 'product-grid', 'cta', 'newsletter'] },
  { id: 'editorial', name: 'Editorial Brand', desc: 'Magazine-style brand page', sections: ['marquee', 'hero', 'rich-text', 'image-text', 'stats', 'faq', 'contact'] }
]

// ============================================================
// Main builder
// ============================================================
function DropZone({ onDrop, onDragOver }) {
  return (
    <div
      className="h-1 transition-all hover:h-9 hover:bg-blue-50 flex items-center justify-center cursor-pointer"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="text-[10px] text-blue-400 opacity-0 hover:opacity-100">Drop here</span>
    </div>
  )
}

// Floating toolbar button (Shopify-style dark pill)
function TbBtn({ onClick, disabled, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${danger ? 'hover:bg-red-500/80' : 'hover:bg-white/15'}`}
    >
      {children}
    </button>
  )
}

// ============================================================
// Preview components — mirror the real storefront (section-renderer.tsx)
// ============================================================
function secWrapStyle(config, type) {
  const design = config.design || {}
  const paddingY = design.paddingY || PADDING_DEFAULTS[type] || 'md'
  return {
    backgroundColor: design.bg || undefined,
    color: design.textColor || undefined,
    paddingTop: PADDING_Y[paddingY] ?? 56,
    paddingBottom: PADDING_Y[paddingY] ?? 56
  }
}

export function SectionPreview({ section, categories, mobile }) {
  const config = typeof section.config === 'string' ? (() => { try { return JSON.parse(section.config) } catch { return {} } })() : section.config

  const preview = (() => {
    switch (section.sectionType) {
      case 'hero': {
        const h = mobile ? (config.heightMobile || '48vh') : (config.height || '60vh')
        const titleSize = { small: 28, medium: 36, large: 46, xlarge: 56 }[config.titleSize] || 46
        const size = mobile ? Math.round(titleSize * 0.72) : titleSize
        const posCls = contentPositionClasses(config.contentPosition).className
        const overlay = overlayStyleFor(config)
        const dark = config.overlay !== 'light'
        return (
          <div className="relative w-full overflow-hidden" style={{ height: h, minHeight: 220 }}>
            {config.image
              ? <img src={config.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              : <div className="absolute inset-0 bg-gradient-to-br from-zinc-300 to-zinc-400" />}
            <div
              className={`absolute inset-0 ${overlay ? '' : dark ? 'bg-gradient-to-b from-black/30 via-black/40 to-black/60' : 'bg-white/30'}`}
              style={overlay || undefined}
            />
            <div className={`absolute inset-0 flex ${posCls}`}>
              <div className="px-8 max-w-[85%]">
                <p className={`font-bold leading-[1.05] tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`} style={{ fontSize: size, fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                  {config.title || 'Hero Banner'}
                </p>
                {config.subtitle && <p className={`mt-3 text-sm md:text-base opacity-85 ${dark ? 'text-white/85' : 'text-zinc-700'}`}>{config.subtitle}</p>}
                {config.buttonText && <span className={`inline-block mt-4 text-xs px-4 py-2 rounded-md font-medium ${dark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}>{config.buttonText}</span>}
              </div>
            </div>
          </div>
        )
      }
      case 'slideshow': {
        const slide = (config.slides || [])[0] || {}
        const h = mobile ? (config.heightMobile || '50vh') : (config.height || '70vh')
        const overlay = overlayStyleFor(config)
        const dark = config.overlay !== 'light'
        const posCls = contentPositionClasses(config.contentPosition).className
        return (
          <div className="relative w-full overflow-hidden" style={{ height: h, minHeight: 200 }}>
            {slide.image
              ? <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              : <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />}
            <div
              className={`absolute inset-0 ${overlay ? '' : 'bg-black/40'}`}
              style={overlay || undefined}
            />
            <div className={`absolute inset-0 flex ${posCls}`}>
              <div className={`px-8 max-w-[85%] ${dark ? 'text-white' : 'text-zinc-900'}`}>
                {slide.eyebrow && <p className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1.5">{slide.eyebrow}</p>}
                <p className="text-2xl md:text-3xl font-bold">{slide.title || 'Slideshow'}</p>
                {slide.subtitle && <p className="text-xs opacity-80 mt-1">{slide.subtitle}</p>}
                {slide.buttonText && <span className={`inline-block mt-3 text-xs px-4 py-2 rounded-md font-medium ${dark ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}>{slide.buttonText}</span>}
              </div>
            </div>
            {(config.slides || []).length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {(config.slides || []).map((_, i) => <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />)}
              </div>
            )}
          </div>
        )
      }
      case 'announcement-bar':
        return <div className="py-2 px-4 text-center" style={{ backgroundColor: config.bg || '#1a1a1a' }}><p className="text-xs font-medium" style={{ color: config.color || '#fff' }}>{config.text || 'Announcement text...'}</p></div>
      case 'product-grid': {
        const cols = mobile ? (parseInt(config.columnsMobile) || 2) : (parseInt(config.columnsDesktop) || 4)
        const count = Math.min(parseInt(config.limit) || 8, cols * 2)
        return (
          <div>
            {config.title && <p className="text-base font-bold mb-3" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>{config.title}</p>}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
              {Array.from({ length: Math.max(count, cols) }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-square rounded-lg bg-muted/60 flex items-center justify-center"><Grid3x3 className="h-5 w-5 text-muted-foreground/40" /></div>
                  <div className="h-2 w-3/4 bg-muted rounded mt-2" />
                  <div className="h-2 w-1/3 bg-muted rounded mt-1" />
                </div>
              ))}
            </div>
            {config.buttonText && <div className="mt-4"><span className="text-xs px-4 py-2 rounded-md border border-border font-medium">{config.buttonText}</span></div>}
          </div>
        )
      }
      case 'image-text': {
        const reversed = config.layout === 'image-right'
        return (
          <div className={`flex flex-col ${mobile ? '' : 'md:flex-row'} gap-5 items-center ${reversed ? (mobile ? '' : 'md:flex-row-reverse') : ''}`}>
            <div className={`w-full ${mobile ? '' : 'md:w-1/2'}`}>
              {config.image
                ? <img src={config.image} alt="" className="w-full aspect-[4/3] object-cover rounded-lg" />
                : <div className="w-full aspect-[4/3] rounded-lg bg-muted/60 flex items-center justify-center"><ImageIcon className="h-7 w-7 text-muted-foreground/40" /></div>}
            </div>
            <div className={`w-full ${mobile ? '' : 'md:w-1/2'}`}>
              <p className="text-base font-bold">{config.title || 'Image + Text'}</p>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-4">{stripTags(config.body)}</p>
              {config.buttonText && <span className="inline-block mt-3 text-xs px-3.5 py-1.5 rounded-md bg-foreground text-background font-medium">{config.buttonText}</span>}
            </div>
          </div>
        )
      }
      case 'marquee':
        return <div className="py-2.5 overflow-hidden" style={{ backgroundColor: config.bg || '#1a1a1a' }}><p className="text-xs font-medium text-center" style={{ color: config.color || '#fff' }}>{config.text}</p></div>
      case 'text':
        return (
          <div className={`text-${config.align || 'center'}`}>
            {config.title && <p className="text-lg font-bold mb-1.5" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>{config.title}</p>}
            <p className="text-sm text-muted-foreground line-clamp-3">{stripTags(config.body)}</p>
          </div>
        )
      case 'image':
        return config.url
          ? <img src={config.url} alt={config.alt || ''} className="w-full max-h-64 object-cover rounded-lg" />
          : <div className="w-full h-40 rounded-lg bg-muted/60 flex items-center justify-center"><ImageIcon className="h-7 w-7 text-muted-foreground/40" /></div>
      case 'rich-text':
        return (
          <div>
            {config.title && <p className="text-lg font-bold mb-1.5">{config.title}</p>}
            <p className="text-sm text-muted-foreground line-clamp-4">{stripTags(config.content)}</p>
          </div>
        )
      case 'testimonials': {
        const items = (config.items || []).slice(0, mobile ? 1 : 3)
        return (
          <div>
            {config.title && <p className="text-base font-bold mb-3 text-center">{config.title}</p>}
            <div className={`grid gap-3 ${mobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {items.map((t, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`h-2.5 w-2.5 ${j < (t.rating || 5) ? 'fill-amber-500 text-amber-500' : 'text-muted'}`} />)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-3">{t.text}</p>
                  <p className="text-[11px] font-medium mt-1.5">{t.author}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case 'faq': {
        const items = (config.items || []).slice(0, 3)
        return (
          <div>
            {config.title && <p className="text-base font-bold mb-3 text-center">{config.title}</p>}
            <div className="space-y-1.5">
              {items.map((f, i) => (
                <div key={i} className="px-3 py-2.5 border border-border rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{f.question}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )
      }
      case 'newsletter':
        return (
          <div className="bg-foreground text-background text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1.5">Newsletter</p>
            <p className="text-lg font-bold">{config.title || 'Newsletter'}</p>
            <p className="text-xs opacity-80 mt-1">{config.subtitle}</p>
            <div className="mt-3 inline-flex gap-1.5"><div className="h-8 w-40 rounded-md bg-background/20" /><div className="h-8 w-16 rounded-md bg-background flex items-center justify-center"><span className="text-[10px] text-foreground font-medium">Subscribe</span></div></div>
          </div>
        )
      case 'discounts':
        return (
          <div>
            {config.title && <p className="text-base font-bold mb-3 text-center">{config.title}</p>}
            <div className={`grid gap-2 ${mobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {[1, 2].map(i => (
                <div key={i} className="p-2.5 rounded-lg border-2 border-dashed border-border flex items-center justify-between">
                  <div><div className="h-2.5 w-14 bg-muted rounded mb-1" /><div className="h-2 w-20 bg-muted rounded" /></div>
                  <span className="text-[10px] px-2 py-1 rounded bg-foreground text-background">Copy</span>
                </div>
              ))}
            </div>
          </div>
        )
      case 'video':
        return (
          <div>
            {config.title && <p className="text-base font-bold mb-3 text-center">{config.title}</p>}
            <div className="aspect-video rounded-lg bg-zinc-900 flex items-center justify-center"><Play className="h-9 w-9 text-white/50" /></div>
          </div>
        )
      case 'custom-html':
        return <div className="font-mono text-[11px] text-muted-foreground bg-muted/40 p-3 rounded-lg line-clamp-4 whitespace-pre-wrap">{config.html || '<!-- Custom HTML -->'}</div>
      case 'countdown': {
        const boxes = [['12', 'Days'], ['08', 'Hours'], ['45', 'Min'], ['30', 'Sec']]
        return (
          <div className="text-center" style={{ backgroundColor: config.bg || '#1a1a1a', color: config.color || '#fff' }}>
            {config.eyebrow && <p className="text-[10px] uppercase tracking-[0.25em] opacity-70">{config.eyebrow}</p>}
            <p className="text-lg font-bold mt-1" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>{config.title || 'Sale ends soon'}</p>
            <div className="mt-3 flex justify-center gap-2.5">
              {boxes.map((b, i) => (
                <div key={i} className="min-w-[52px] rounded-lg border px-2.5 py-2" style={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-xl font-bold tabular-nums">{b[0]}</p>
                  <p className="text-[9px] uppercase tracking-wider opacity-70 mt-0.5">{b[1]}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case 'cta':
        return (
          <div className="rounded-2xl px-6 py-10 text-center" style={{ backgroundColor: config.bg || '#1a1a1a', color: config.color || '#fff' }}>
            {config.eyebrow && <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1.5">{config.eyebrow}</p>}
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>{config.title || 'CTA Banner'}</p>
            {config.subtitle && <p className="text-xs opacity-80 mt-1.5 max-w-md mx-auto">{config.subtitle}</p>}
            {config.buttonText && <span className="inline-block mt-4 text-xs px-5 py-2.5 rounded-md font-medium" style={{ backgroundColor: config.color || '#fff', color: config.bg || '#1a1a1a' }}>{config.buttonText}</span>}
          </div>
        )
      case 'stats': {
        const items = (config.items || []).slice(0, mobile ? 2 : 4)
        return (
          <div className={`grid gap-6 text-center ${mobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {items.map((s, i) => (
              <div key={i}>
                <p className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )
      }
      case 'logo-cloud': {
        const items = (config.items || []).slice(0, 4)
        return (
          <div>
            {config.title && <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">{config.title}</p>}
            <div className={`flex items-center justify-center gap-6 ${mobile ? 'flex-wrap' : ''}`}>
              {items.map((l, i) => (
                <span key={i} className="text-sm font-semibold text-muted-foreground/70" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                  {l.image ? <img src={l.image} alt="" className="h-7 w-auto object-contain grayscale" /> : l.name}
                </span>
              ))}
            </div>
          </div>
        )
      }
      case 'contact':
        return (
          <div className={`grid gap-5 ${mobile ? '' : 'grid-cols-[1fr_auto]'}`}>
            <div className="space-y-2">
              <div className="h-9 rounded-md border border-input bg-muted/30" />
              <div className="h-9 rounded-md border border-input bg-muted/30" />
              <div className="h-16 rounded-md border border-input bg-muted/30" />
              <div className="h-9 w-28 rounded-md bg-foreground" />
            </div>
            {!mobile && (
              <div className="space-y-2.5 w-44">
                {[1, 2, 3].map(i => <div key={i} className="flex gap-2 items-center"><div className="h-7 w-7 rounded-full bg-muted" /><div className="flex-1"><div className="h-2 w-20 bg-muted rounded" /><div className="h-2 w-14 bg-muted rounded mt-1" /></div></div>)}
              </div>
            )}
          </div>
        )
      default:
        return <div className="p-4 text-xs text-muted-foreground">Unknown section type</div>
    }
  })()

  return (
    <div style={secWrapStyle(config, section.sectionType)} data-sec-preview="">
      {(config.design?.customCss || config.customCss) && (
        <style dangerouslySetInnerHTML={{ __html: scopeSectionCss(config.design?.customCss || config.customCss, '[data-sec-preview]') }} />
      )}
      <div className="px-4 md:px-8 max-w-5xl mx-auto w-full">
        {preview}
      </div>
    </div>
  )
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ============================================================
// Section config editor (right panel — Content tab)
// ============================================================
export function SectionConfigEditor({ section, categories, device, setDevice, onUpdate }) {
  const config = section.config
  const set = (k, v) => onUpdate({ ...config, [k]: v })
  const needsDevice = ['hero', 'product-grid', 'slideshow'].includes(section.sectionType)

  const updateListItem = (key, index, field, value) => {
    const items = [...(config[key] || [])]
    items[index] = { ...items[index], [field]: value }
    set(key, items)
  }
  const addListItem = (key, template) => set(key, [...(config[key] || []), template])
  const removeListItem = (key, index) => set(key, (config[key] || []).filter((_, i) => i !== index))
  const moveListItem = (key, index, dir) => {
    const items = [...(config[key] || [])]
    const to = index + dir
    if (to < 0 || to >= items.length) return
    const [m] = items.splice(index, 1)
    items.splice(to, 0, m)
    set(key, items)
  }

  return (
    <div className="space-y-3.5">
      {needsDevice && (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Editing values for</Label>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setDevice('desktop')} className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 ${device === 'desktop' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}><Monitor className="h-3 w-3" /> Desktop</button>
            <button onClick={() => setDevice('mobile')} className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 ${device === 'mobile' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}><Smartphone className="h-3 w-3" /> Mobile</button>
          </div>
        </div>
      )}

      {section.sectionType === 'hero' && (
        <>
          <div><Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field></div>
          <div><Field label="Subtitle"><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field></div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Button text"><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></Field>
            <Field label="Button URL"><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></Field>
          </div>
          <Field label="Background image"><FileUpload type="image" value={config.image || ''} onChange={(url) => set('image', url)} /></Field>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Overlay opacity</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{config.overlayOpacity ?? 40}%</span>
            </div>
            <input type="range" min={0} max={90} step={5} value={config.overlayOpacity ?? 40} onChange={(e) => set('overlayOpacity', parseInt(e.target.value))} className="w-full mt-1 accent-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Text color">
              <Select value={config.overlay || 'dark'} onChange={(v) => set('overlay', v)} options={[['dark', 'White text'], ['light', 'Dark text']]} />
            </Field>
            <Field label="Title size">
              <Select value={config.titleSize || 'large'} onChange={(v) => set('titleSize', v)} options={[['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['xlarge', 'Huge']]} />
            </Field>
          </div>
          <Field label="Content position">
            <Select value={config.contentPosition || 'middle-left'} onChange={(v) => set('contentPosition', v)} options={POSITION_OPTIONS} />
          </Field>
          {device === 'desktop' ? (
            <Field label="Height (desktop)">
              <Select value={config.height || '60vh'} onChange={(v) => set('height', v)} options={[['45vh', 'Small'], ['60vh', 'Medium'], ['78vh', 'Large'], ['100vh', 'Full screen']]} />
            </Field>
          ) : (
            <Field label="Height (mobile)">
              <Select value={config.heightMobile || '48vh'} onChange={(v) => set('heightMobile', v)} options={[['40vh', 'Small'], ['48vh', 'Medium'], ['60vh', 'Large'], ['80vh', 'Full screen']]} />
            </Field>
          )}
        </>
      )}

      {section.sectionType === 'slideshow' && (
        <>
          {(config.slides || []).map((s, i) => (
            <div key={i} className="p-3 border border-border rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Slide #{i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => moveListItem('slides', i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => moveListItem('slides', i, 1)} disabled={i === (config.slides || []).length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => removeListItem('slides', i)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <FileUpload type="image" value={s.image || ''} onChange={(url) => updateListItem('slides', i, 'image', url)} />
              <Input value={s.eyebrow || ''} onChange={(e) => updateListItem('slides', i, 'eyebrow', e.target.value)} placeholder="Eyebrow (optional)" className="h-8 text-xs" />
              <Input value={s.title || ''} onChange={(e) => updateListItem('slides', i, 'title', e.target.value)} placeholder="Headline" className="h-8 text-xs" />
              <Input value={s.subtitle || ''} onChange={(e) => updateListItem('slides', i, 'subtitle', e.target.value)} placeholder="Subtitle" className="h-8 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={s.buttonText || ''} onChange={(e) => updateListItem('slides', i, 'buttonText', e.target.value)} placeholder="Button text" className="h-8 text-xs" />
                <Input value={s.buttonUrl || ''} onChange={(e) => updateListItem('slides', i, 'buttonUrl', e.target.value)} placeholder="Button URL" className="h-8 text-xs" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('slides', { image: '', eyebrow: '', title: 'New slide', subtitle: '', buttonText: 'Shop now', buttonUrl: '/products' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add slide</Button>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Autoplay">
              <div className="flex items-center h-9"><Switch checked={config.autoplay !== false} onCheckedChange={(v) => set('autoplay', v)} /></div>
            </Field>
            <Field label="Show arrows">
              <div className="flex items-center h-9"><Switch checked={config.arrows !== false} onCheckedChange={(v) => set('arrows', v)} /></div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Overlay text">
              <Select value={config.overlay || 'dark'} onChange={(v) => set('overlay', v)} options={[['dark', 'White text'], ['light', 'Dark text']]} />
            </Field>
            <Field label="Seconds per slide"><Input type="number" min={2} max={15} value={config.interval || 5} onChange={(e) => set('interval', parseInt(e.target.value) || 5)} /></Field>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Overlay opacity</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{config.overlayOpacity ?? 40}%</span>
            </div>
            <input type="range" min={0} max={90} step={5} value={config.overlayOpacity ?? 40} onChange={(e) => set('overlayOpacity', parseInt(e.target.value))} className="w-full mt-1 accent-blue-600" />
          </div>
          <Field label="Content position">
            <Select value={config.contentPosition || 'middle-left'} onChange={(v) => set('contentPosition', v)} options={POSITION_OPTIONS} />
          </Field>
          {device === 'desktop'
            ? <Field label="Height (desktop)"><Select value={config.height || '70vh'} onChange={(v) => set('height', v)} options={[['45vh', 'Small'], ['60vh', 'Medium'], ['70vh', 'Large'], ['100vh', 'Full screen']]} /></Field>
            : <Field label="Height (mobile)"><Select value={config.heightMobile || '50vh'} onChange={(v) => set('heightMobile', v)} options={[['40vh', 'Small'], ['50vh', 'Medium'], ['60vh', 'Large'], ['80vh', 'Full screen']]} /></Field>}
        </>
      )}

      {section.sectionType === 'announcement-bar' && (
        <>
          <Field label="Text"><Input value={config.text || ''} onChange={(e) => set('text', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {section.sectionType === 'product-grid' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Source">
              <Select value={config.source || 'featured'} onChange={(v) => set('source', v)} options={[['featured', 'Featured'], ['new', 'New Arrivals'], ['sale', 'On Sale'], ['all', 'All Products']]} />
            </Field>
            <Field label="Limit"><Input type="number" min={2} max={24} value={config.limit || 8} onChange={(e) => set('limit', parseInt(e.target.value) || 8)} /></Field>
          </div>
          {categories && categories.length > 0 && (
            <Field label="Filter by category (optional)">
              <Select value={config.categoryId || ''} onChange={(v) => set('categoryId', v)} options={[['', 'All categories'], ...categories.map(c => [c.id, c.name])]} />
            </Field>
          )}
          {device === 'desktop'
            ? <Field label="Columns (desktop)"><Select value={String(config.columnsDesktop || 4)} onChange={(v) => set('columnsDesktop', parseInt(v))} options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} /></Field>
            : <Field label="Columns (mobile)"><Select value={String(config.columnsMobile || 2)} onChange={(v) => set('columnsMobile', parseInt(v))} options={[['1', '1'], ['2', '2'], ['3', '3']]} /></Field>}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Button text (optional)"><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} placeholder="View all" /></Field>
            <Field label="Button URL"><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></Field>
          </div>
        </>
      )}

      {section.sectionType === 'image-text' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Body (HTML)"><Textarea rows={4} value={config.body || ''} onChange={(e) => set('body', e.target.value)} /></Field>
          <Field label="Image"><FileUpload type="image" value={config.image || ''} onChange={(url) => set('image', url)} /></Field>
          <Field label="Layout">
            <Select value={config.layout || 'image-left'} onChange={(v) => set('layout', v)} options={[['image-left', 'Image left, text right'], ['image-right', 'Text left, image right']]} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Button text"><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></Field>
            <Field label="Button URL"><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></Field>
          </div>
        </>
      )}

      {section.sectionType === 'marquee' && (
        <>
          <Field label="Text"><Input value={config.text || ''} onChange={(e) => set('text', e.target.value)} /></Field>
          <Field label="Speed"><Select value={config.speed || 'normal'} onChange={(v) => set('speed', v)} options={[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {section.sectionType === 'text' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Body (HTML)"><Textarea rows={4} value={config.body || ''} onChange={(e) => set('body', e.target.value)} /></Field>
          <Field label="Alignment"><Select value={config.align || 'center'} onChange={(v) => set('align', v)} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} /></Field>
        </>
      )}

      {section.sectionType === 'image' && (
        <>
          <Field label="Image"><FileUpload type="image" value={config.url || ''} onChange={(url) => set('url', url)} /></Field>
          <Field label="Alt text"><Input value={config.alt || ''} onChange={(e) => set('alt', e.target.value)} /></Field>
          <Field label="Link (optional)"><Input value={config.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/products" /></Field>
        </>
      )}

      {section.sectionType === 'rich-text' && (
        <>
          <Field label="Title (optional)"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Content (HTML)"><Textarea rows={8} value={config.content || ''} onChange={(e) => set('content', e.target.value)} className="font-mono text-xs" /></Field>
        </>
      )}

      {section.sectionType === 'testimonials' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          {(config.items || []).map((item, i) => (
            <div key={i} className="p-3 border border-border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => moveListItem('items', i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => moveListItem('items', i, 1)} disabled={i === (config.items || []).length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={item.author || ''} onChange={(e) => updateListItem('items', i, 'author', e.target.value)} placeholder="Author" className="h-8 text-xs" />
                <Input value={item.role || ''} onChange={(e) => updateListItem('items', i, 'role', e.target.value)} placeholder="Role" className="h-8 text-xs" />
              </div>
              <Select value={String(item.rating || 5)} onChange={(v) => updateListItem('items', i, 'rating', parseInt(v))} options={[['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']]} />
              <Textarea rows={2} value={item.text || ''} onChange={(e) => updateListItem('items', i, 'text', e.target.value)} placeholder="Quote" className="text-xs" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('items', { author: 'New Author', role: 'Verified Buyer', rating: 5, text: '' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add testimonial</Button>
        </>
      )}

      {section.sectionType === 'faq' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          {(config.items || []).map((item, i) => (
            <div key={i} className="p-3 border border-border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{i + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => moveListItem('items', i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => moveListItem('items', i, 1)} disabled={i === (config.items || []).length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <Input value={item.question || ''} onChange={(e) => updateListItem('items', i, 'question', e.target.value)} placeholder="Question" className="h-8 text-xs" />
              <Textarea rows={2} value={item.answer || ''} onChange={(e) => updateListItem('items', i, 'answer', e.target.value)} placeholder="Answer" className="text-xs" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('items', { question: 'New question?', answer: 'Answer here.' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add FAQ</Button>
        </>
      )}

      {section.sectionType === 'newsletter' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Subtitle"><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field>
        </>
      )}

      {section.sectionType === 'discounts' && (
        <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
      )}

      {section.sectionType === 'video' && (
        <>
          <Field label="Title (optional)"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Video URL">
            <Input value={config.videoUrl || ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            <p className="text-[10px] text-muted-foreground mt-1">YouTube, Vimeo, or direct video URL</p>
          </Field>
        </>
      )}

      {section.sectionType === 'countdown' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Eyebrow"><Input value={config.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} placeholder="Limited time" /></Field>
            <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          </div>
          <Field label="Ends at">
            <Input type="datetime-local" value={config.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">The timer hides itself automatically after this moment.</p>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Button text"><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></Field>
            <Field label="Button URL"><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {section.sectionType === 'cta' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Eyebrow"><Input value={config.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
            <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          </div>
          <Field label="Subtitle"><Textarea rows={2} value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Button text"><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></Field>
            <Field label="Button URL"><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {section.sectionType === 'stats' && (
        <>
          {(config.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={item.value || ''} onChange={(e) => updateListItem('items', i, 'value', e.target.value)} placeholder="10k+" className="h-8 text-xs w-20" />
              <Input value={item.label || ''} onChange={(e) => updateListItem('items', i, 'label', e.target.value)} placeholder="Label" className="h-8 text-xs flex-1" />
              <button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('items', { value: '100+', label: 'New stat' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add stat</Button>
        </>
      )}

      {section.sectionType === 'logo-cloud' && (
        <>
          <Field label="Title (optional)"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="As seen in" /></Field>
          {(config.items || []).map((item, i) => (
            <div key={i} className="p-2.5 border border-border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{i + 1}</span>
                <button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <Input value={item.name || ''} onChange={(e) => updateListItem('items', i, 'name', e.target.value)} placeholder="Name (fallback)" className="h-8 text-xs" />
                  <Input value={item.link || ''} onChange={(e) => updateListItem('items', i, 'link', e.target.value)} placeholder="Link (optional)" className="h-8 text-xs" />
                </div>
                <FileUpload type="image" value={item.image || ''} onChange={(url) => updateListItem('items', i, 'image', url)} />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('items', { name: 'BRAND', link: '', image: '' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add logo</Button>
        </>
      )}

      {section.sectionType === 'contact' && (
        <>
          <Field label="Title"><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Subtitle"><Textarea rows={2} value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field>
          <Field label="Contact email shown"><Input value={config.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="hello@yourstore.com" /></Field>
        </>
      )}

      {section.sectionType === 'custom-html' && (
        <Field label="Custom HTML"><Textarea rows={8} value={config.html || ''} onChange={(e) => set('html', e.target.value)} className="font-mono text-xs" /></Field>
      )}
    </div>
  )
}

// ============================================================
// Design tab — universal section styling
// ============================================================
export function DesignEditor({ config, sectionType, onUpdate }) {
  const design = config.design || {}
  const set = (k, v) => onUpdate({ ...design, [k]: v })
  const paddingValue = design.paddingY || PADDING_DEFAULTS[sectionType] || 'md'

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Background" value={design.bg} defaultV="" onChange={(v) => set('bg', v)} allowEmpty />
        <ColorField label="Text color" value={design.textColor} defaultV="" onChange={(v) => set('textColor', v)} allowEmpty />
      </div>
      <Field label="Vertical spacing">
        <Select value={paddingValue} onChange={(v) => set('paddingY', v)} options={[['none', 'None'], ['sm', 'Small'], ['md', 'Medium (default)'], ['lg', 'Large'], ['xl', 'Extra large']]} />
      </Field>
      <Field label="Content width">
        <Select value={design.maxWidth || ''} onChange={(v) => set('maxWidth', v)} options={[['', 'Normal (default)'], ['narrow', 'Narrow'], ['wide', 'Wide'], ['full', 'Full width']]} />
      </Field>
      <Field label={
        <span>Custom CSS <span className="text-muted-foreground">(advanced)</span></span>
      }>
        <Textarea
          rows={5}
          value={design.customCss || ''}
          onChange={(e) => set('customCss', e.target.value)}
          className="font-mono text-xs"
          placeholder={'h2 {\n  letter-spacing: 2px;\n}\nimg {\n  border-radius: 12px;\n}'}
        />
        <p className="text-[10px] text-muted-foreground mt-1">Applies only inside this section — selectors are scoped automatically, just like Shopify themes.</p>
      </Field>
      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Per-section design</p>
        <p>Background and text color apply to this section only. Clear a color to use the theme default. For a whole-store look, use <strong>Themes</strong> in the left panel.</p>
      </div>
    </div>
  )
}

// ============================================================
// Small shared inputs
// ============================================================
function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function ColorField({ label, value, defaultV, onChange, allowEmpty }) {
  const current = value || defaultV || '#000000'
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1.5 mt-1.5">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 rounded border border-input cursor-pointer shrink-0" />
        <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={allowEmpty ? 'theme default' : defaultV} className="font-mono text-xs" />
        {allowEmpty && value && (
          <button onClick={() => onChange('')} className="text-muted-foreground hover:text-foreground shrink-0" title="Reset to theme default"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>
    </div>
  )
}
