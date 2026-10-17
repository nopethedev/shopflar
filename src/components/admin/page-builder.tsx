'use client'
import { useState, useRef } from 'react'
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
import { FileUpload } from '@/components/shared/file-upload'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Image as ImageIcon, Type, Mail, Gift, Layout, Scroll, Grid3x3, Code,
  GripVertical, Monitor, Smartphone, X, Settings2, Copy
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
  const [selectedSection, setSelectedSection] = useState(null)  // section id for side panel
  const [previewDevice, setPreviewDevice] = useState('desktop')  // desktop | mobile
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

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
        const newSec = { ...d.section, config: JSON.parse(d.section.config) }
        setSections([...sections, newSec])
        toast.success('Section added')
        setAdding(false)
        setSelectedSection(newSec.id)
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    }
  }

  const updateSection = (id, config) => {
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

  const duplicateSection = async (id) => {
    const section = sections.find(s => s.id === id)
    if (!section) return
    try {
      const r = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'home',
          sectionType: section.sectionType,
          config: JSON.stringify(section.config),
          sortOrder: sections.length,
          isVisible: true
        })
      })
      if (r.ok) {
        const d = await r.json()
        const newSec = { ...d.section, config: JSON.parse(d.section.config) }
        setSections([...sections, newSec])
        toast.success('Section duplicated')
        router.refresh()
      }
    } catch (e) {
      toast.error('Failed', e.message)
    }
  }

  const moveSection = (id, direction) => {
    const idx = sections.findIndex(s => s.id === id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sections.length) return
    const reordered = [...sections]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, moved)
    const withOrders = reordered.map((s, i) => ({ ...s, sortOrder: i }))
    setSections(withOrders)
    // Persist all sort orders
    Promise.all(withOrders.map(s =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: s.sortOrder })
      })
    )).then(() => {
      toast.success('Reordered')
      router.refresh()
    })
  }

  // Drag and drop
  const handleDragStart = (e, id) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) setDragOverId(id)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    const draggedIdx = sections.findIndex(s => s.id === draggedId)
    const targetIdx = sections.findIndex(s => s.id === targetId)
    if (draggedIdx === -1 || targetIdx === -1) return
    const reordered = [...sections]
    const [moved] = reordered.splice(draggedIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    const withOrders = reordered.map((s, i) => ({ ...s, sortOrder: i }))
    setSections(withOrders)
    setDraggedId(null)
    setDragOverId(null)
    // Persist
    Promise.all(withOrders.map(s =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: s.sortOrder })
      })
    )).then(() => {
      toast.success('Reordered')
      router.refresh()
    })
  }

  const delSection = async (id) => {
    if (!confirm('Delete this section?')) return
    const r = await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setSections(sections.filter(s => s.id !== id))
      if (selectedSection === id) setSelectedSection(null)
      toast.success('Deleted')
      router.refresh()
    }
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection)

  return (
    <div className="flex gap-6">
      {/* ===== Left: Section list + preview ===== */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${previewDevice === 'desktop' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${previewDevice === 'mobile' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
          </div>
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Add Section
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
                    className="text-left p-4 rounded-md border border-border hover:border-foreground/40 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-colors">
                        <t.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Preview canvas */}
        <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
          <div className="rounded-xl border-2 border-dashed border-border overflow-hidden bg-background">
            {sections.length === 0 ? (
              <div className="p-16 text-center">
                <Layout className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-semibold">Your page is empty</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Add sections to build your home page. Drag to reorder, click to edit.
                </p>
                <Button onClick={() => setAdding(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" /> Add your first section
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sections.map((section, idx) => {
                  const sectionType = SECTION_TYPES.find(t => t.type === section.sectionType)
                  const Icon = sectionType?.icon || Code
                  const isSelected = selectedSection === section.id
                  const isDragOver = dragOverId === section.id
                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, section.id)}
                      onDragOver={(e) => handleDragOver(e, section.id)}
                      onDrop={(e) => handleDrop(e, section.id)}
                      onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                      className={`relative group transition-all ${
                        isSelected ? 'ring-2 ring-foreground ring-inset' : ''
                      } ${
                        isDragOver ? 'border-t-4 border-t-foreground' : ''
                      } ${
                        !section.isVisible ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Section header bar */}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{sectionType?.label || section.sectionType}</span>
                          {!section.isVisible && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveSection(section.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => moveSection(section.id, 'down')} disabled={idx === sections.length - 1} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => duplicateSection(section.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Duplicate">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleVisible(section.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
                            {section.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => delSection(section.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Live preview */}
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedSection(section.id)}
                      >
                        <SectionPreview section={section} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          💡 Drag sections to reorder · Click a section to edit its content · Use the eye icon to hide temporarily
        </p>
      </div>

      {/* ===== Right: Side panel for editing selected section ===== */}
      {selectedSectionData && (
        <div className="w-80 shrink-0">
          <div className="sticky top-24">
            <Card className="p-0">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Edit Section</h3>
                </div>
                <button onClick={() => setSelectedSection(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Panel content */}
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <SectionConfigEditor
                  section={selectedSectionData}
                  categories={categories}
                  onUpdate={(config) => updateSection(selectedSectionData.id, config)}
                />
              </div>

              {/* Panel footer */}
              <div className="px-4 py-3 border-t border-border flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => saveSection(selectedSectionData.id)}
                  disabled={saving === selectedSectionData.id}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving === selectedSectionData.id ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Preview components (mini live render) ============
function SectionPreview({ section }) {
  const config = typeof section.config === 'string' ? JSON.parse(section.config) : section.config

  switch (section.sectionType) {
    case 'hero':
      return (
        <div className="relative h-32 bg-gradient-to-br from-muted to-muted/60 overflow-hidden">
          {config.image && <img src={config.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div>
              <p className="text-sm font-bold truncate">{config.title || 'Hero Banner'}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{config.subtitle}</p>
              {config.buttonText && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-foreground text-background">{config.buttonText}</span>}
            </div>
          </div>
        </div>
      )

    case 'product-grid':
      return (
        <div className="p-4">
          <p className="text-sm font-semibold mb-2">{config.title || 'Product Grid'}</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: config.limit || 4 }).slice(0, 4).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-muted/50 flex items-center justify-center">
                <Grid3x3 className="h-4 w-4 text-muted-foreground/50" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Source: {config.source} · {config.limit || 8} products</p>
        </div>
      )

    case 'marquee':
      return (
        <div className="py-2 overflow-hidden" style={{ backgroundColor: config.bg || '#1a1a1a' }}>
          <p className="text-xs font-medium text-center px-4 truncate" style={{ color: config.color || '#fff' }}>
            {config.text || 'Marquee text...'}
          </p>
        </div>
      )

    case 'text':
      return (
        <div className={`p-4 text-${config.align || 'center'}`}>
          <p className="text-sm font-semibold">{config.title || 'Text Block'}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{config.body?.replace(/<[^>]+>/g, '')}</p>
        </div>
      )

    case 'image':
      return (
        <div className="p-4">
          {config.url ? (
            <img src={config.url} alt={config.alt || ''} className="w-full h-24 object-cover rounded" />
          ) : (
            <div className="w-full h-24 rounded bg-muted/50 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
        </div>
      )

    case 'newsletter':
      return (
        <div className="p-4 bg-foreground text-background text-center">
          <p className="text-sm font-bold">{config.title || 'Newsletter'}</p>
          <p className="text-xs opacity-80 mt-0.5">{config.subtitle}</p>
          <div className="mt-2 inline-flex gap-1">
            <div className="h-6 w-24 rounded bg-background/20" />
            <div className="h-6 w-12 rounded bg-background" />
          </div>
        </div>
      )

    case 'discounts':
      return (
        <div className="p-4">
          <p className="text-sm font-semibold mb-2">{config.title || 'Discount Codes'}</p>
          <div className="flex gap-2">
            {[1, 2].map(i => (
              <div key={i} className="flex-1 p-2 rounded border-2 border-dashed border-border">
                <div className="h-2 w-12 bg-muted rounded mb-1" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      )

    case 'custom-html':
      return (
        <div className="p-4">
          <div className="font-mono text-xs text-muted-foreground bg-muted/30 p-2 rounded line-clamp-3">
            {config.html || '<!-- Custom HTML -->'}
          </div>
        </div>
      )

    default:
      return <div className="p-4 text-xs text-muted-foreground">Unknown section type</div>
  }
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
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Subtitle</Label><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Button Text</Label><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></div>
            <div><Label className="text-xs">Button URL</Label><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></div>
          </div>
          <div>
            <Label className="text-xs">Background Image</Label>
            <FileUpload type="image" value={config.image || ''} onChange={(url) => set('image', url)} />
          </div>
          <div>
            <Label className="text-xs">Overlay</Label>
            <select value={config.overlay || 'dark'} onChange={(e) => set('overlay', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm">
              <option value="dark">Dark (white text)</option>
              <option value="light">Light (dark text)</option>
            </select>
          </div>
        </div>
      )
    case 'product-grid':
      return (
        <div className="space-y-3">
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
        <div className="space-y-3">
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
            <div><Label className="text-xs">Background</Label><Input value={config.bg || '#1a1a1a'} onChange={(e) => set('bg', e.target.value)} className="font-mono" type="color" /></div>
          </div>
          <div><Label className="text-xs">Text color</Label><Input value={config.color || '#ffffff'} onChange={(e) => set('color', e.target.value)} className="font-mono" type="color" /></div>
        </div>
      )
    case 'text':
      return (
        <div className="space-y-3">
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
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Image</Label>
            <FileUpload type="image" value={config.url || ''} onChange={(url) => set('url', url)} />
          </div>
          <div><Label className="text-xs">Alt text</Label><Input value={config.alt || ''} onChange={(e) => set('alt', e.target.value)} /></div>
          <div><Label className="text-xs">Link (optional)</Label><Input value={config.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/products" /></div>
        </div>
      )
    case 'newsletter':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Subtitle</Label><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div>
        </div>
      )
    case 'discounts':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Shows all active discount codes from Admin → Discounts.</p>
        </div>
      )
    case 'custom-html':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Custom HTML</Label><Textarea rows={8} value={config.html || ''} onChange={(e) => set('html', e.target.value)} className="font-mono text-xs" /></div>
        </div>
      )
    default:
      return <p className="text-xs text-muted-foreground">No editor for this section type.</p>
  }
}
