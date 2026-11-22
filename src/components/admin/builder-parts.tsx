'use client'
// Inspector panels for the theme editor: per-section content controls and the
// shared design tab. The live canvas is the real storefront (see page-builder);
// nothing in here renders a mock preview any more.
import { createContext, useContext, useId, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FileUpload } from '@/components/shared/file-upload'
import {
  SECTION_CATALOG as CATALOG, GROUPS as CATALOG_GROUPS, TEMPLATES as CATALOG_TEMPLATES,
  defaultConfig as catalogDefaultConfig, FEATURE_ICONS, SOCIAL_PLATFORMS
} from '@/lib/section-catalog'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Monitor, Smartphone, X, Bold, Italic, Link2, List, Heading2, Heading3, Quote
} from 'lucide-react'
import {
  Layout, Megaphone, Type, AlignLeft, ShieldCheck, Minus, Grid3x3, LayoutGrid, ShoppingBag, Gift, Image as ImageIcon,
  Columns, PanelsTopLeft, Images, Play, Video, Timer, Scroll, Mail, Share2, MessageSquare, BarChart3, Building2,
  HelpCircle, MessageCircle, Code, Layers
} from 'lucide-react'

// ------------------------------------------------------------
// Catalog re-exports (icons resolved here so lib/ stays React-free)
// ------------------------------------------------------------
const ICONS = {
  Layout, Megaphone, Type, AlignLeft, ShieldCheck, Minus, Grid3x3, LayoutGrid, ShoppingBag, Gift, Image: ImageIcon,
  Columns, PanelsTopLeft, Images, Play, Video, Timer, Scroll, Mail, Share2, MessageSquare, BarChart3, Building2,
  HelpCircle, MessageCircle, Code, Quote
}

export const SECTION_CATALOG = CATALOG.map(s => ({ ...s, icon: ICONS[s.icon] || Layers }))
export const GROUPS = CATALOG_GROUPS as unknown as string[]
export const TEMPLATES = CATALOG_TEMPLATES
export const defaultConfig = catalogDefaultConfig

// ------------------------------------------------------------
// Editor context — link & product suggestions for URL / product fields
// ------------------------------------------------------------
type EditorCtx = {
  categories: { id: string; name: string; slug: string }[]
  links: { value: string; label: string }[]
  products: { id: string; name: string; slug: string }[]
}
export const EditorContext = createContext<EditorCtx>({ categories: [], links: [], products: [] })

const PADDING_DEFAULTS = { hero: 'none', slideshow: 'none', 'announcement-bar': 'none', marquee: 'none', newsletter: 'lg', spacer: 'none' }

// Shopify-style 9-way position picker
const POSITION_OPTIONS = [
  ['top-left', 'Top left'], ['top-center', 'Top center'], ['top-right', 'Top right'],
  ['middle-left', 'Middle left'], ['middle-center', 'Middle center'], ['middle-right', 'Middle right'],
  ['bottom-left', 'Bottom left'], ['bottom-center', 'Bottom center'], ['bottom-right', 'Bottom right']
]

// ============================================================
// Section config editor (right panel — Content tab)
// ============================================================
export function SectionConfigEditor({ section, device, setDevice, onUpdate }) {
  const config = section.config || {}
  const set = (k, v) => onUpdate({ ...config, [k]: v })
  const type = section.sectionType
  const needsDevice = ['hero', 'product-grid', 'slideshow', 'gallery', 'collection-list'].includes(type)

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
  const listProps = (key) => ({
    total: (config[key] || []).length,
    onMove: (i, d) => moveListItem(key, i, d),
    onRemove: (i) => removeListItem(key, i)
  })
  const text = (key, label, props = {}) => (
    <Field label={label}><Input value={config[key] || ''} onChange={(e) => set(key, e.target.value)} {...props} /></Field>
  )
  const url = (key = 'buttonUrl', label = 'Button URL') => (
    <Field label={label}><UrlInput value={config[key] || ''} onChange={(v) => set(key, v)} /></Field>
  )

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

      {type === 'hero' && (
        <>
          {text('title', 'Title')}
          {text('subtitle', 'Subtitle')}
          <div className="grid grid-cols-2 gap-2">
            {text('buttonText', 'Button text')}
            {url()}
          </div>
          <Field label="Background image"><FileUpload type="image" value={config.image || ''} onChange={(v) => set('image', v)} /></Field>
          <Range label="Overlay opacity" value={config.overlayOpacity ?? 40} onChange={(v) => set('overlayOpacity', v)} max={90} />
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

      {type === 'slideshow' && (
        <>
          {(config.slides || []).map((s, i) => (
            <ItemCard key={i} title={`Slide #${i + 1}`} index={i} {...listProps('slides')}>
              <FileUpload type="image" value={s.image || ''} onChange={(v) => updateListItem('slides', i, 'image', v)} />
              <Input value={s.eyebrow || ''} onChange={(e) => updateListItem('slides', i, 'eyebrow', e.target.value)} placeholder="Eyebrow (optional)" className="h-8 text-xs" />
              <Input value={s.title || ''} onChange={(e) => updateListItem('slides', i, 'title', e.target.value)} placeholder="Headline" className="h-8 text-xs" />
              <Input value={s.subtitle || ''} onChange={(e) => updateListItem('slides', i, 'subtitle', e.target.value)} placeholder="Subtitle" className="h-8 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={s.buttonText || ''} onChange={(e) => updateListItem('slides', i, 'buttonText', e.target.value)} placeholder="Button text" className="h-8 text-xs" />
                <UrlInput value={s.buttonUrl || ''} onChange={(v) => updateListItem('slides', i, 'buttonUrl', v)} placeholder="Button URL" className="h-8 text-xs" />
              </div>
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('slides', { image: '', eyebrow: '', title: 'New slide', subtitle: '', buttonText: 'Shop now', buttonUrl: '/products' })}>Add slide</AddButton>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Autoplay"><div className="flex items-center h-9"><Switch checked={config.autoplay !== false} onCheckedChange={(v) => set('autoplay', v)} /></div></Field>
            <Field label="Show arrows"><div className="flex items-center h-9"><Switch checked={config.arrows !== false} onCheckedChange={(v) => set('arrows', v)} /></div></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Overlay text">
              <Select value={config.overlay || 'dark'} onChange={(v) => set('overlay', v)} options={[['dark', 'White text'], ['light', 'Dark text']]} />
            </Field>
            <Field label="Seconds per slide"><Input type="number" min={2} max={15} value={config.interval || 5} onChange={(e) => set('interval', parseInt(e.target.value) || 5)} /></Field>
          </div>
          <Range label="Overlay opacity" value={config.overlayOpacity ?? 40} onChange={(v) => set('overlayOpacity', v)} max={90} />
          <Field label="Content position">
            <Select value={config.contentPosition || 'middle-left'} onChange={(v) => set('contentPosition', v)} options={POSITION_OPTIONS} />
          </Field>
          {device === 'desktop'
            ? <Field label="Height (desktop)"><Select value={config.height || '70vh'} onChange={(v) => set('height', v)} options={[['45vh', 'Small'], ['60vh', 'Medium'], ['70vh', 'Large'], ['100vh', 'Full screen']]} /></Field>
            : <Field label="Height (mobile)"><Select value={config.heightMobile || '50vh'} onChange={(v) => set('heightMobile', v)} options={[['40vh', 'Small'], ['50vh', 'Medium'], ['60vh', 'Large'], ['80vh', 'Full screen']]} /></Field>}
        </>
      )}

      {type === 'announcement-bar' && (
        <>
          {text('text', 'Text')}
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {type === 'product-grid' && <ProductGridFields config={config} set={set} device={device} url={url} text={text} />}

      {type === 'image-text' && (
        <>
          {text('title', 'Title')}
          <Field label="Body"><HtmlInput value={config.body || ''} onChange={(v) => set('body', v)} rows={4} /></Field>
          <Field label="Image"><FileUpload type="image" value={config.image || ''} onChange={(v) => set('image', v)} /></Field>
          <Field label="Layout">
            <Select value={config.layout || 'image-left'} onChange={(v) => set('layout', v)} options={[['image-left', 'Image left, text right'], ['image-right', 'Text left, image right']]} />
          </Field>
          <div className="grid grid-cols-2 gap-2">{text('buttonText', 'Button text')}{url()}</div>
        </>
      )}

      {type === 'marquee' && (
        <>
          {text('text', 'Text')}
          <Field label="Speed"><Select value={config.speed || 'normal'} onChange={(v) => set('speed', v)} options={[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {type === 'text' && (
        <>
          {text('title', 'Title')}
          <Field label="Body"><HtmlInput value={config.body || ''} onChange={(v) => set('body', v)} rows={4} /></Field>
          <Field label="Alignment"><Select value={config.align || 'center'} onChange={(v) => set('align', v)} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} /></Field>
        </>
      )}

      {type === 'image' && (
        <>
          <Field label="Image"><FileUpload type="image" value={config.url || ''} onChange={(v) => set('url', v)} /></Field>
          {text('alt', 'Alt text')}
          {url('link', 'Link (optional)')}
        </>
      )}

      {type === 'rich-text' && (
        <>
          {text('title', 'Title (optional)')}
          <Field label="Content"><HtmlInput value={config.content || ''} onChange={(v) => set('content', v)} rows={8} /></Field>
        </>
      )}

      {type === 'testimonials' && (
        <>
          {text('title', 'Title')}
          {(config.items || []).map((item, i) => (
            <ItemCard key={i} title={`#${i + 1}`} index={i} {...listProps('items')}>
              <div className="grid grid-cols-2 gap-2">
                <Input value={item.author || ''} onChange={(e) => updateListItem('items', i, 'author', e.target.value)} placeholder="Author" className="h-8 text-xs" />
                <Input value={item.role || ''} onChange={(e) => updateListItem('items', i, 'role', e.target.value)} placeholder="Role" className="h-8 text-xs" />
              </div>
              <Select value={String(item.rating || 5)} onChange={(v) => updateListItem('items', i, 'rating', parseInt(v))} options={[['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']]} />
              <Textarea rows={2} value={item.text || ''} onChange={(e) => updateListItem('items', i, 'text', e.target.value)} placeholder="Quote" className="text-xs" />
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('items', { author: 'New Author', role: 'Verified Buyer', rating: 5, text: '' })}>Add testimonial</AddButton>
        </>
      )}

      {type === 'faq' && (
        <>
          {text('title', 'Title')}
          {(config.items || []).map((item, i) => (
            <ItemCard key={i} title={`#${i + 1}`} index={i} {...listProps('items')}>
              <Input value={item.question || ''} onChange={(e) => updateListItem('items', i, 'question', e.target.value)} placeholder="Question" className="h-8 text-xs" />
              <Textarea rows={2} value={item.answer || ''} onChange={(e) => updateListItem('items', i, 'answer', e.target.value)} placeholder="Answer" className="text-xs" />
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('items', { question: 'New question?', answer: 'Answer here.' })}>Add FAQ</AddButton>
        </>
      )}

      {type === 'newsletter' && (<>{text('title', 'Title')}{text('subtitle', 'Subtitle')}</>)}
      {type === 'discounts' && text('title', 'Title')}

      {type === 'video' && (
        <>
          {text('title', 'Title (optional)')}
          <Field label="Video URL">
            <Input value={config.videoUrl || ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            <p className="text-[10px] text-muted-foreground mt-1">YouTube, Vimeo, or direct video URL</p>
          </Field>
        </>
      )}

      {type === 'countdown' && (
        <>
          <div className="grid grid-cols-2 gap-2">{text('eyebrow', 'Eyebrow', { placeholder: 'Limited time' })}{text('title', 'Title')}</div>
          <Field label="Ends at">
            <Input type="datetime-local" value={config.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">The timer hides itself automatically after this moment.</p>
          </Field>
          <div className="grid grid-cols-2 gap-2">{text('buttonText', 'Button text')}{url()}</div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {type === 'cta' && (
        <>
          <div className="grid grid-cols-2 gap-2">{text('eyebrow', 'Eyebrow')}{text('title', 'Title')}</div>
          <Field label="Subtitle"><Textarea rows={2} value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">{text('buttonText', 'Button text')}{url()}</div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={config.bg} defaultV="#1a1a1a" onChange={(v) => set('bg', v)} />
            <ColorField label="Text color" value={config.color} defaultV="#ffffff" onChange={(v) => set('color', v)} />
          </div>
        </>
      )}

      {type === 'stats' && (
        <>
          {text('title', 'Title (optional)')}
          {(config.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={item.value || ''} onChange={(e) => updateListItem('items', i, 'value', e.target.value)} placeholder="10k+" className="h-8 text-xs w-20" />
              <Input value={item.label || ''} onChange={(e) => updateListItem('items', i, 'label', e.target.value)} placeholder="Label" className="h-8 text-xs flex-1" />
              <button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Remove stat"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <AddButton onClick={() => addListItem('items', { value: '100+', label: 'New stat' })}>Add stat</AddButton>
        </>
      )}

      {type === 'logo-cloud' && (
        <>
          {text('title', 'Title (optional)', { placeholder: 'As seen in' })}
          {(config.items || []).map((item, i) => (
            <ItemCard key={i} title={`#${i + 1}`} index={i} {...listProps('items')}>
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <Input value={item.name || ''} onChange={(e) => updateListItem('items', i, 'name', e.target.value)} placeholder="Name (fallback)" className="h-8 text-xs" />
                  <UrlInput value={item.link || ''} onChange={(v) => updateListItem('items', i, 'link', v)} placeholder="Link (optional)" className="h-8 text-xs" />
                </div>
                <FileUpload type="image" value={item.image || ''} onChange={(v) => updateListItem('items', i, 'image', v)} />
              </div>
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('items', { name: 'BRAND', link: '', image: '' })}>Add logo</AddButton>
        </>
      )}

      {type === 'contact' && (
        <>
          {text('title', 'Title')}
          <Field label="Subtitle"><Textarea rows={2} value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field>
          {text('email', 'Contact email shown', { placeholder: 'hello@yourstore.com' })}
        </>
      )}

      {type === 'custom-html' && (
        <Field label="Custom HTML"><Textarea rows={8} value={config.html || ''} onChange={(e) => set('html', e.target.value)} className="font-mono text-xs" /></Field>
      )}

      {/* ---------------- new blocks ---------------- */}
      {type === 'features' && (
        <>
          {text('title', 'Title (optional)')}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Columns"><Select value={String(config.columns || 4)} onChange={(v) => set('columns', parseInt(v))} options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} /></Field>
            <Field label="Alignment"><Select value={config.align || 'center'} onChange={(v) => set('align', v)} options={[['center', 'Center'], ['left', 'Left']]} /></Field>
          </div>
          {(config.items || []).map((item, i) => (
            <ItemCard key={i} title={`#${i + 1}`} index={i} {...listProps('items')}>
              <Select value={item.icon || 'sparkles'} onChange={(v) => updateListItem('items', i, 'icon', v)} options={FEATURE_ICONS.map(ic => [ic, ic.replace('-', ' ')])} />
              <Input value={item.title || ''} onChange={(e) => updateListItem('items', i, 'title', e.target.value)} placeholder="Title" className="h-8 text-xs" />
              <Textarea rows={2} value={item.text || ''} onChange={(e) => updateListItem('items', i, 'text', e.target.value)} placeholder="Short description" className="text-xs" />
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('items', { icon: 'sparkles', title: 'New feature', text: '' })}>Add feature</AddButton>
        </>
      )}

      {type === 'spacer' && (
        <>
          <Range label="Height" value={config.height ?? 48} onChange={(v) => set('height', v)} max={240} step={8} unit="px" />
          <Field label="Divider line"><div className="flex items-center h-9"><Switch checked={!!config.divider} onCheckedChange={(v) => set('divider', v)} /></div></Field>
        </>
      )}

      {type === 'collection-list' && (
        <>
          {text('title', 'Title')}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Max categories"><Input type="number" min={1} max={24} value={config.limit || 6} onChange={(e) => set('limit', parseInt(e.target.value) || 6)} /></Field>
            <Field label="Tile shape"><Select value={config.aspect || 'portrait'} onChange={(v) => set('aspect', v)} options={[['portrait', 'Portrait'], ['square', 'Square'], ['landscape', 'Landscape']]} /></Field>
          </div>
          {device === 'desktop'
            ? <Field label="Columns (desktop)"><Select value={String(config.columnsDesktop || 3)} onChange={(v) => set('columnsDesktop', parseInt(v))} options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} /></Field>
            : <Field label="Columns (mobile)"><Select value={String(config.columnsMobile || 2)} onChange={(v) => set('columnsMobile', parseInt(v))} options={[['1', '1'], ['2', '2'], ['3', '3']]} /></Field>}
          <Field label="Show product count"><div className="flex items-center h-9"><Switch checked={!!config.showCount} onCheckedChange={(v) => set('showCount', v)} /></div></Field>
          <p className="text-[11px] text-muted-foreground">Tiles come from your visible top-level categories. Manage them under Products → Categories.</p>
        </>
      )}

      {type === 'featured-product' && <FeaturedProductFields config={config} set={set} text={text} />}

      {type === 'promo-tiles' && (
        <>
          {text('title', 'Title (optional)')}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Columns"><Select value={String(config.columns || 2)} onChange={(v) => set('columns', parseInt(v))} options={[['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']]} /></Field>
            <Field label="Tile height"><Select value={config.height || 'medium'} onChange={(v) => set('height', v)} options={[['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]} /></Field>
          </div>
          {(config.tiles || []).map((t, i) => (
            <ItemCard key={i} title={`Tile #${i + 1}`} index={i} {...listProps('tiles')}>
              <FileUpload type="image" value={t.image || ''} onChange={(v) => updateListItem('tiles', i, 'image', v)} />
              <Input value={t.title || ''} onChange={(e) => updateListItem('tiles', i, 'title', e.target.value)} placeholder="Headline" className="h-8 text-xs" />
              <Input value={t.subtitle || ''} onChange={(e) => updateListItem('tiles', i, 'subtitle', e.target.value)} placeholder="Subtitle" className="h-8 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={t.buttonText || ''} onChange={(e) => updateListItem('tiles', i, 'buttonText', e.target.value)} placeholder="Link text" className="h-8 text-xs" />
                <UrlInput value={t.buttonUrl || ''} onChange={(v) => updateListItem('tiles', i, 'buttonUrl', v)} placeholder="Link URL" className="h-8 text-xs" />
              </div>
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('tiles', { image: '', title: 'New tile', subtitle: '', buttonText: 'Shop now', buttonUrl: '/products' })}>Add tile</AddButton>
        </>
      )}

      {type === 'gallery' && (
        <>
          {text('title', 'Title (optional)')}
          <div className="grid grid-cols-2 gap-2">
            {device === 'desktop'
              ? <Field label="Columns (desktop)"><Select value={String(config.columnsDesktop || 4)} onChange={(v) => set('columnsDesktop', parseInt(v))} options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} /></Field>
              : <Field label="Columns (mobile)"><Select value={String(config.columnsMobile || 2)} onChange={(v) => set('columnsMobile', parseInt(v))} options={[['1', '1'], ['2', '2'], ['3', '3']]} /></Field>}
            <Field label="Spacing"><Select value={config.gap || 'md'} onChange={(v) => set('gap', v)} options={[['none', 'None'], ['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']]} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Shape"><Select value={config.aspect || 'square'} onChange={(v) => set('aspect', v)} options={[['square', 'Square'], ['portrait', 'Portrait'], ['landscape', 'Landscape'], ['auto', 'Original']]} /></Field>
            <Field label="Rounded corners"><div className="flex items-center h-9"><Switch checked={config.rounded !== false} onCheckedChange={(v) => set('rounded', v)} /></div></Field>
          </div>
          {(config.images || []).map((g, i) => (
            <ItemCard key={i} title={`Image #${i + 1}`} index={i} {...listProps('images')}>
              <FileUpload type="image" value={g.image || ''} onChange={(v) => updateListItem('images', i, 'image', v)} />
              <Input value={g.alt || ''} onChange={(e) => updateListItem('images', i, 'alt', e.target.value)} placeholder="Alt text" className="h-8 text-xs" />
              <UrlInput value={g.link || ''} onChange={(v) => updateListItem('images', i, 'link', v)} placeholder="Link (optional)" className="h-8 text-xs" />
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('images', { image: '', alt: '', link: '' })}>Add image</AddButton>
        </>
      )}

      {type === 'quote' && (
        <>
          <Field label="Quote"><Textarea rows={4} value={config.text || ''} onChange={(e) => set('text', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">{text('author', 'Author')}{text('role', 'Role / source')}</div>
          <Field label="Avatar (optional)"><FileUpload type="image" value={config.image || ''} onChange={(v) => set('image', v)} /></Field>
        </>
      )}

      {type === 'social-links' && (
        <>
          {text('title', 'Heading (optional)')}
          <Field label="Alignment"><Select value={config.align || 'center'} onChange={(v) => set('align', v)} options={[['center', 'Center'], ['left', 'Left']]} /></Field>
          {(config.items || []).map((it, i) => (
            <ItemCard key={i} title={`#${i + 1}`} index={i} {...listProps('items')}>
              <Select value={it.platform || 'website'} onChange={(v) => updateListItem('items', i, 'platform', v)} options={SOCIAL_PLATFORMS.map(p => [p, p === 'x' ? 'X (Twitter)' : p[0].toUpperCase() + p.slice(1)])} />
              <Input value={it.url || ''} onChange={(e) => updateListItem('items', i, 'url', e.target.value)} placeholder="https://…" className="h-8 text-xs" />
            </ItemCard>
          ))}
          <AddButton onClick={() => addListItem('items', { platform: 'instagram', url: 'https://' })}>Add profile</AddButton>
        </>
      )}
    </div>
  )
}

function ProductGridFields({ config, set, device, url, text }) {
  const { categories } = useContext(EditorContext)
  return (
    <>
      {text('title', 'Title')}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Source">
          <Select value={config.source || 'featured'} onChange={(v) => set('source', v)} options={[['featured', 'Featured'], ['new', 'New Arrivals'], ['sale', 'On Sale'], ['all', 'All Products']]} />
        </Field>
        <Field label="Limit"><Input type="number" min={2} max={24} value={config.limit || 8} onChange={(e) => set('limit', parseInt(e.target.value) || 8)} /></Field>
      </div>
      {categories.length > 0 && (
        <Field label="Filter by category (optional)">
          <Select value={config.categoryId || ''} onChange={(v) => set('categoryId', v)} options={[['', 'All categories'], ...categories.map(c => [c.id, c.name])]} />
        </Field>
      )}
      {device === 'desktop'
        ? <Field label="Columns (desktop)"><Select value={String(config.columnsDesktop || 4)} onChange={(v) => set('columnsDesktop', parseInt(v))} options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} /></Field>
        : <Field label="Columns (mobile)"><Select value={String(config.columnsMobile || 2)} onChange={(v) => set('columnsMobile', parseInt(v))} options={[['1', '1'], ['2', '2'], ['3', '3']]} /></Field>}
      <div className="grid grid-cols-2 gap-2">
        {text('buttonText', 'Button text (optional)', { placeholder: 'View all' })}
        {url()}
      </div>
    </>
  )
}

function FeaturedProductFields({ config, set, text }) {
  const { products } = useContext(EditorContext)
  return (
    <>
      {text('title', 'Eyebrow label (optional)', { placeholder: 'Bestseller' })}
      <Field label="Product">
        <Select
          value={config.productSlug || ''}
          onChange={(v) => set('productSlug', v)}
          options={[['', 'Latest featured product'], ...products.map(p => [p.slug, p.name])]}
        />
      </Field>
      <Field label="Layout"><Select value={config.layout || 'image-left'} onChange={(v) => set('layout', v)} options={[['image-left', 'Image left'], ['image-right', 'Image right']]} /></Field>
      {text('buttonText', 'Button text')}
      <Field label="Show description"><div className="flex items-center h-9"><Switch checked={config.showDescription !== false} onCheckedChange={(v) => set('showDescription', v)} /></div></Field>
    </>
  )
}

// ============================================================
// Design tab — universal section styling
// ============================================================
export function DesignEditor({ config, sectionType, onUpdate }) {
  const design = config.design || {}
  const set = (k, v) => {
    const next = { ...design, [k]: v }
    // Drop empty values so the stored config stays tidy and defaults apply
    if (v === '' || v === undefined || v === false) delete next[k]
    onUpdate(next)
  }
  const paddingValue = design.paddingY || PADDING_DEFAULTS[sectionType] || 'md'

  return (
    <div className="space-y-3.5">
      <SubHead>Colors</SubHead>
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Background" value={design.bg} defaultV="" onChange={(v) => set('bg', v)} allowEmpty />
        <ColorField label="Text color" value={design.textColor} defaultV="" onChange={(v) => set('textColor', v)} allowEmpty />
      </div>
      <Field label="Background image"><FileUpload type="image" value={design.bgImage || ''} onChange={(v) => set('bgImage', v)} /></Field>
      {design.bgImage && <Range label="Darken image" value={design.bgOverlay ?? 0} onChange={(v) => set('bgOverlay', v)} max={90} />}

      <SubHead>Layout</SubHead>
      <Field label="Vertical spacing">
        <Select value={paddingValue} onChange={(v) => { set('paddingY', v) }} options={[['none', 'None'], ['xs', 'Tiny'], ['sm', 'Small'], ['md', 'Medium (default)'], ['lg', 'Large'], ['xl', 'Extra large']]} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Custom top (px)"><Input type="number" min={0} max={400} value={design.paddingTop ?? ''} onChange={(e) => set('paddingTop', e.target.value === '' ? '' : Math.max(0, Math.min(400, parseInt(e.target.value) || 0)))} placeholder="auto" /></Field>
        <Field label="Custom bottom (px)"><Input type="number" min={0} max={400} value={design.paddingBottom ?? ''} onChange={(e) => set('paddingBottom', e.target.value === '' ? '' : Math.max(0, Math.min(400, parseInt(e.target.value) || 0)))} placeholder="auto" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Content width">
          <Select value={design.maxWidth || ''} onChange={(v) => set('maxWidth', v)} options={[['', 'Normal'], ['narrow', 'Narrow'], ['wide', 'Wide'], ['full', 'Full width']]} />
        </Field>
        <Field label="Text alignment">
          <Select value={design.align || ''} onChange={(v) => set('align', v)} options={[['', 'Default'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Top border"><div className="flex items-center h-9"><Switch checked={!!design.borderTop} onCheckedChange={(v) => set('borderTop', v)} /></div></Field>
        <Field label="Bottom border"><div className="flex items-center h-9"><Switch checked={!!design.borderBottom} onCheckedChange={(v) => set('borderBottom', v)} /></div></Field>
      </div>

      <SubHead>Behavior</SubHead>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Show on">
          <Select value={design.hideOn || ''} onChange={(v) => set('hideOn', v)} options={[['', 'All devices'], ['mobile', 'Desktop only'], ['desktop', 'Mobile only']]} />
        </Field>
        <Field label="Animation">
          <Select value={design.animation || ''} onChange={(v) => set('animation', v)} options={[['', 'None'], ['fade-up', 'Fade up']]} />
        </Field>
      </div>
      <Field label="Anchor ID (optional)">
        <Input value={design.anchorId || ''} onChange={(e) => set('anchorId', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="sale" className="font-mono text-xs" />
        <p className="text-[10px] text-muted-foreground mt-1">Link to this section from anywhere with <code>#{design.anchorId || 'sale'}</code>.</p>
      </Field>

      <SubHead>Advanced</SubHead>
      <Field label={<span>Custom CSS <span className="text-muted-foreground">(advanced)</span></span>}>
        <Textarea
          rows={5}
          value={design.customCss || ''}
          onChange={(e) => set('customCss', e.target.value)}
          className="font-mono text-xs"
          placeholder={'h2 {\n  letter-spacing: 2px;\n}\nimg {\n  border-radius: 12px;\n}'}
        />
        <p className="text-[10px] text-muted-foreground mt-1">Applies only inside this section — selectors are scoped automatically, just like Shopify themes.</p>
      </Field>
      <button
        type="button"
        onClick={() => onUpdate({})}
        className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Reset all design settings for this section
      </button>
    </div>
  )
}

// ============================================================
// Small shared inputs
// ============================================================
function SubHead({ children }) {
  return <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t border-border/60 first:border-0 first:pt-0 mt-1">{children}</p>
}

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
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm capitalize">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function Range({ label, value, onChange, max = 100, step = 5, unit = '%' }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{value}{unit}</span>
      </div>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full mt-1 accent-blue-600" />
    </div>
  )
}

function ColorField({ label, value, defaultV, onChange, allowEmpty = false }) {
  const current = value || defaultV || '#000000'
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1.5 mt-1.5 items-center">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 rounded border border-input cursor-pointer shrink-0" />
        <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={allowEmpty ? 'theme default' : defaultV} className="font-mono text-xs" />
        {allowEmpty && value && (
          <button onClick={() => onChange('')} className="text-muted-foreground hover:text-foreground shrink-0" title="Reset to theme default" aria-label="Reset color"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>
    </div>
  )
}

function ItemCard({ title, index, total, onMove, onRemove, children }) {
  return (
    <div className="p-3 border border-border rounded-lg space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onMove(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3 w-3" /></button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3 w-3" /></button>
          <button onClick={() => onRemove(index)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {children}
    </div>
  )
}

function AddButton({ onClick, children }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}><Plus className="h-3.5 w-3.5 mr-1" /> {children}</Button>
  )
}

// URL input with suggestions for pages, categories and products on this store
function UrlInput({ value, onChange, placeholder = '/products', className = '' }) {
  const { links } = useContext(EditorContext)
  const listId = useId()
  return (
    <>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        className={className}
      />
      <datalist id={listId}>
        {links.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </datalist>
    </>
  )
}

// HTML textarea with a one-click formatting toolbar (wraps the selection)
function HtmlInput({ value, onChange, rows = 6 }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const wrap = (open: string, close: string, placeholder = 'text') => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const selected = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + open + selected + close + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + open.length, start + open.length + selected.length)
    })
  }
  const link = () => {
    const href = window.prompt('Link URL', 'https://')
    if (href) wrap(`<a href="${href.replace(/"/g, '&quot;')}">`, '</a>', 'link text')
  }

  const tools = [
    { icon: Bold, title: 'Bold', run: () => wrap('<strong>', '</strong>') },
    { icon: Italic, title: 'Italic', run: () => wrap('<em>', '</em>') },
    { icon: Heading2, title: 'Heading 2', run: () => wrap('<h2>', '</h2>', 'Heading') },
    { icon: Heading3, title: 'Heading 3', run: () => wrap('<h3>', '</h3>', 'Heading') },
    { icon: List, title: 'Bulleted list', run: () => wrap('<ul>\n  <li>', '</li>\n</ul>', 'Item') },
    { icon: Quote, title: 'Quote', run: () => wrap('<blockquote>', '</blockquote>', 'Quote') },
    { icon: Link2, title: 'Link', run: link }
  ]

  return (
    <div className="rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring/30">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-input bg-muted/40">
        {tools.map(t => (
          <button key={t.title} type="button" title={t.title} aria-label={t.title} onMouseDown={(e) => e.preventDefault()} onClick={t.run}
            className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground">
            <t.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <Textarea ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="border-0 rounded-none shadow-none focus-visible:ring-0 font-mono text-xs" />
    </div>
  )
}
