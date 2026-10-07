'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Image as ImageIcon, Type, Mail, Gift, Layout, Scroll, Grid3x3, Code
} from 'lucide-react'

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero Banner', icon: Layout, description: 'Large image with title, subtitle, and CTA button' },
  { type: 'product-grid', label: 'Product Grid', icon: Grid3x3, description: 'Show featured, new, or filtered products' },
  { type: 'marquee', label: 'Marquee', icon: Scroll, description: 'Scrolling text banner — great for announcements' },
  { type: 'text', label: 'Text Block', icon: Type, description: 'Heading + paragraph of custom text' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Single image with optional link' },
  { type: 'newsletter', label: 'Newsletter Signup', icon: Mail, description: 'Email subscribe form with prompt text' },
  { type: 'discounts', label: 'Discount Codes', icon: Gift, description: 'Show active discount codes customers can copy' },
  { type: 'custom-html', label: 'Custom HTML', icon: Code, description: 'Raw HTML code block' }
]

export function PageBuilder({ initialSections, categories }) {
  const router = useRouter()
  const [sections, setSections] = useState(initialSections)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(null)

  const addSection = async (type) => {
    const newSection = {
      type,
      config: defaultConfig(type),
      sortOrder: sections.length,
      isVisible: true
    }
    try {
      const r = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType: 'home', ...newSection })
      })
      if (r.ok) {
        const d = await r.json()
        setSections([...sections, { ...d.section, config: JSON.parse(d.section.config) }])
        toast.success('Section added')
        setAdding(false)
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    }
  }

  const updateSection = async (id, config) => {
    setSections(sections.map(s => s.id === id ? { ...s, config } : s))
  }

  const saveSection = async (id) => {
    setSaving(id)
    const section = sections.find(s => s.id === id)
    try {
      const r = await fetch(`/api/admin/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: JSON.stringify(section.config),
          isVisible: section.isVisible
        })
      })
      if (r.ok) {
        toast.success('Saved')
        router.refresh()
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(null)
    }
  }

  const toggleVisible = async (id) => {
    const section = sections.find(s => s.id === id)
    const updated = { ...section, isVisible: !section.isVisible }
    setSections(sections.map(s => s.id === id ? updated : s))
    await saveSection(id)
  }

  const moveSection = async (id, direction) => {
    const idx = sections.findIndex(s => s.id === id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sections.length) return
    const reordered = [...sections]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, moved)
    // Update sort orders
    const withOrders = reordered.map((s, i) => ({ ...s, sortOrder: i }))
    setSections(withOrders)
    // Save all sort orders
    await Promise.all(withOrders.map(s =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: s.sortOrder })
      })
    ))
    toast.success('Reordered')
    router.refresh()
  }

  const delSection = async (id) => {
    if (!confirm('Delete this section?')) return
    const r = await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setSections(sections.filter(s => s.id !== id))
      toast.success('Deleted')
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Sections list */}
      <div className="space-y-3">
        {sections.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No sections yet. The home page will use the default layout.</p>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add your first section
            </Button>
          </Card>
        ) : (
          sections.map((section, idx) => {
            const sectionType = SECTION_TYPES.find(t => t.type === section.sectionType)
            const Icon = sectionType?.icon || Code
            return (
              <Card key={section.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${section.isVisible ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm flex items-center gap-2">
                        {sectionType?.label || section.sectionType}
                        {!section.isVisible && <Badge variant="secondary">Hidden</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{sectionType?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveSection(section.id, 'up')}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === sections.length - 1} onClick={() => moveSection(section.id, 'down')}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisible(section.id)}>
                      {section.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delSection(section.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Section config */}
                <div className="mt-3 pt-3 border-t border-border">
                  <SectionConfigEditor
                    section={section}
                    categories={categories}
                    onUpdate={(config) => updateSection(section.id, config)}
                  />
                  <Button size="sm" className="mt-3" onClick={() => saveSection(section.id)} disabled={saving === section.id}>
                    <Save className="h-3.5 w-3.5 mr-1" /> {saving === section.id ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Add section button */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Section
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a section</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-2">
            {SECTION_TYPES.map(t => (
              <button
                key={t.type}
                onClick={() => addSection(t.type)}
                className="text-left p-4 rounded-md border border-border hover:border-foreground/40 hover:bg-muted/30 transition-colors"
              >
                <t.icon className="h-5 w-5 mb-2" />
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/30">
        💡 Tip: Sections are rendered top-to-bottom on your home page. Drag with the arrows to reorder.
        Hide a section temporarily without deleting it by clicking the eye icon.
      </div>
    </div>
  )
}

function defaultConfig(type) {
  const defaults = {
    hero: { title: 'New Section', subtitle: 'Add your subtitle here', buttonText: 'Shop Now', buttonUrl: '/products', image: '', overlay: 'dark' },
    'product-grid': { title: 'Products', source: 'featured', limit: 8 },
    marquee: { text: '🔥 Sale now on • Free shipping over $75 • New arrivals weekly 🔥', speed: 'normal', bg: '#1a1a1a', color: '#ffffff' },
    text: { title: 'Section Title', body: 'Add your text here. HTML is supported.', align: 'center' },
    image: { url: '', alt: '', link: '', width: 'full' },
    newsletter: { title: 'Get 10% off your first order', subtitle: 'Subscribe to our newsletter' },
    discounts: { title: 'Active Discount Codes', showActive: true },
    'custom-html': { html: '<div>\n  <p>Your custom HTML here.</p>\n</div>' }
  }
  return defaults[type] || {}
}

function SectionConfigEditor({ section, categories, onUpdate }) {
  const config = section.config
  const set = (k, v) => onUpdate({ ...config, [k]: v })

  switch (section.sectionType) {
    case 'hero':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Subtitle</Label><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Button Text</Label><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></div>
            <div><Label className="text-xs">Button URL</Label><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Image URL</Label><Input value={config.image || ''} onChange={(e) => set('image', e.target.value)} placeholder="https://..." /></div>
        </div>
      )
    case 'product-grid':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Source</Label>
              <select value={config.source || 'featured'} onChange={(e) => set('source', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm">
                <option value="featured">Featured</option>
                <option value="new">New Arrivals</option>
                <option value="sale">On Sale</option>
                <option value="all">All Products</option>
              </select>
            </div>
            <div><Label className="text-xs">Limit</Label><Input type="number" value={config.limit || 8} onChange={(e) => set('limit', parseInt(e.target.value) || 8)} /></div>
          </div>
        </div>
      )
    case 'marquee':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Text</Label><Input value={config.text || ''} onChange={(e) => set('text', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Speed</Label>
              <select value={config.speed || 'normal'} onChange={(e) => set('speed', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm">
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
            <div><Label className="text-xs">Background color</Label><Input value={config.bg || '#1a1a1a'} onChange={(e) => set('bg', e.target.value)} className="font-mono" /></div>
          </div>
          <div><Label className="text-xs">Text color</Label><Input value={config.color || '#ffffff'} onChange={(e) => set('color', e.target.value)} className="font-mono" /></div>
        </div>
      )
    case 'text':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Body (HTML supported)</Label><Textarea rows={4} value={config.body || ''} onChange={(e) => set('body', e.target.value)} /></div>
          <div>
            <Label className="text-xs">Alignment</Label>
            <select value={config.align || 'center'} onChange={(e) => set('align', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      )
    case 'image':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Image URL</Label><Input value={config.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://..." /></div>
          <div><Label className="text-xs">Alt text</Label><Input value={config.alt || ''} onChange={(e) => set('alt', e.target.value)} /></div>
          <div><Label className="text-xs">Link (optional)</Label><Input value={config.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/products" /></div>
        </div>
      )
    case 'newsletter':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Subtitle</Label><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div>
        </div>
      )
    case 'discounts':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Shows all active discount codes from Admin → Discounts. Customers can copy them.</p>
        </div>
      )
    case 'custom-html':
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Custom HTML</Label><Textarea rows={6} value={config.html || ''} onChange={(e) => set('html', e.target.value)} className="font-mono text-sm" /></div>
        </div>
      )
    default:
      return <p className="text-xs text-muted-foreground">No editor for this section type.</p>
  }
}
