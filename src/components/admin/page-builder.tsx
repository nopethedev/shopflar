'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { FileUpload } from '@/components/shared/file-upload'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save,
  Image as ImageIcon, Type, Mail, Gift, Layout, Scroll, Grid3x3, Code,
  GripVertical, Monitor, Smartphone, Tablet, X, Settings2, Copy,
  RotateCcw, Upload, Megaphone, Columns, MessageSquare, HelpCircle, Video,
  Star, Play
} from 'lucide-react'

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero Banner', icon: Layout, description: 'Large image with title, subtitle, and CTA button' },
  { type: 'announcement-bar', label: 'Announcement Bar', icon: Megaphone, description: 'Thin bar at the top with a message' },
  { type: 'product-grid', label: 'Product Grid', icon: Grid3x3, description: 'Show featured, new, or filtered products' },
  { type: 'image-text', label: 'Image + Text', icon: Columns, description: 'Side-by-side image and text with CTA' },
  { type: 'marquee', label: 'Marquee', icon: Scroll, description: 'Scrolling text banner for announcements' },
  { type: 'text', label: 'Text Block', icon: Type, description: 'Heading + paragraph of custom text' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Single image with optional link' },
  { type: 'rich-text', label: 'Rich Text', icon: Type, description: 'Long-form text content with HTML formatting' },
  { type: 'testimonials', label: 'Testimonials', icon: MessageSquare, description: 'Customer reviews with star ratings' },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, description: 'Collapsible questions and answers' },
  { type: 'newsletter', label: 'Newsletter Signup', icon: Mail, description: 'Email subscribe form with prompt text' },
  { type: 'discounts', label: 'Discount Codes', icon: Gift, description: 'Show active discount codes customers can copy' },
  { type: 'video', label: 'Video', icon: Video, description: 'YouTube/Vimeo embed or self-hosted video' },
  { type: 'custom-html', label: 'Custom HTML', icon: Code, description: 'Raw HTML code block' }
]

export function PageBuilder({ initialSections, categories, pageType = 'home', pageId = null }) {
  const [sections, setSections] = useState(initialSections)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [hasDraftChanges, setHasDraftChanges] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Autosave: debounced save of the selected section's config
  const autosaveTimerRef = useRef(null)
  const autosave = useCallback((id, config) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/sections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        })
        if (r.ok) {
          setHasDraftChanges(true)
        }
      } catch (e) {
        console.error('Autosave failed:', e)
      }
    }, 1500)
  }, [])

  // Update local state + trigger autosave
  const updateSectionConfig = (id, config) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, config } : s))
    autosave(id, config)
  }

  const addSection = async (type) => {
    try {
      const r = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          pageId,
          sectionType: type,
          config: defaultConfig(type),
          sortOrder: sections.length,
          isVisible: true
        })
      })
      if (r.ok) {
        const d = await r.json()
        setSections([...sections, d.section])
        setSelectedSection(d.section.id)
        setHasDraftChanges(true)
        toast.success('Section added — click Publish to make it live')
        setAdding(false)
      } else {
        throw new Error('Failed to add section')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    }
  }

  const toggleVisible = async (id) => {
    const section = sections.find(s => s.id === id)
    const newVisible = !section.isVisible
    setSections(prev => prev.map(s => s.id === id ? { ...s, isVisible: newVisible } : s))
    try {
      await fetch(`/api/admin/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: newVisible })
      })
      setHasDraftChanges(true)
    } catch (e) {
      toast.error('Toggle failed')
    }
  }

  const duplicateSection = async (id) => {
    const section = sections.find(s => s.id === id)
    if (!section) return
    try {
      const r = await fetch(`/api/admin/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicate: true })
      })
      if (r.ok) {
        const d = await r.json()
        setSections([...sections, d.section])
        setHasDraftChanges(true)
        toast.success('Section duplicated')
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
    // Persist sort orders
    Promise.all(withOrders.map(s =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: s.sortOrder })
      })
    ))
    setHasDraftChanges(true)
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
    Promise.all(withOrders.map(s =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: s.sortOrder })
      })
    ))
    setHasDraftChanges(true)
  }

  const delSection = async (id) => {
    if (!confirm('Delete this section? It will be removed when you publish changes.')) return
    try {
      const r = await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' })
      if (r.ok) {
        setSections(sections.filter(s => s.id !== id))
        if (selectedSection === id) setSelectedSection(null)
        setHasDraftChanges(true)
        toast.success('Section removed — click Publish to make it permanent')
      }
    } catch (e) {
      toast.error('Failed')
    }
  }

  const publishChanges = async () => {
    setPublishing(true)
    try {
      const r = await fetch('/api/admin/sections/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageId, action: 'publish' })
      })
      if (r.ok) {
        setHasDraftChanges(false)
        toast.success('Changes published', 'Your storefront is now updated')
      } else {
        throw new Error('Publish failed')
      }
    } catch (e) {
      toast.error('Publish failed', e.message)
    } finally {
      setPublishing(false)
    }
  }

  const discardChanges = async () => {
    if (!confirm('Discard all unpublished changes? This will revert to the last published version.')) return
    setPublishing(true)
    try {
      const r = await fetch('/api/admin/sections/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageId, action: 'discard' })
      })
      if (r.ok) {
        // Reload sections from server
        const params = new URLSearchParams({ pageType, includeDraft: 'false' })
        if (pageId) params.set('pageId', pageId)
        const sr = await fetch(`/api/admin/sections?${params}`)
        const sd = await sr.json()
        setSections(sd.sections.map(s => ({
          ...s,
          config: typeof s.config === 'string' ? JSON.parse(s.config) : s.config
        })))
        setHasDraftChanges(false)
        setSelectedSection(null)
        toast.success('Changes discarded')
      }
    } catch (e) {
      toast.error('Discard failed', e.message)
    } finally {
      setPublishing(false)
    }
  }

  const selectedSectionData = sections.find(s => s.id === selectedSection)

  const previewWidth = previewDevice === 'mobile' ? 'max-w-[375px]' : previewDevice === 'tablet' ? 'max-w-[768px]' : 'max-w-full'

  return (
    <div className="flex gap-6">
      {/* ===== Left: Section list + preview ===== */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button onClick={() => setPreviewDevice('desktop')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${previewDevice === 'desktop' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button onClick={() => setPreviewDevice('tablet')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${previewDevice === 'tablet' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
                <Tablet className="h-3.5 w-3.5" /> Tablet
              </button>
              <button onClick={() => setPreviewDevice('mobile')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${previewDevice === 'mobile' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
            {hasDraftChanges && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Unpublished changes</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={discardChanges} disabled={!hasDraftChanges || publishing}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Discard
            </Button>
            <Button size="sm" onClick={publishChanges} disabled={!hasDraftChanges || publishing}>
              <Upload className="h-3.5 w-3.5 mr-1" /> {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>

        {/* Add section button */}
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" /> Add Section
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add a section</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-2">
              {SECTION_TYPES.map(t => (
                <button key={t.type} onClick={() => addSection(t.type)} className="text-left p-4 rounded-md border border-border hover:border-foreground/40 hover:bg-muted/30 transition-colors group">
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

        {/* Preview canvas */}
        <div className={`mx-auto transition-all ${previewWidth}`}>
          <div className="rounded-xl border-2 border-dashed border-border overflow-hidden bg-background">
            {sections.length === 0 ? (
              <div className="p-16 text-center">
                <Layout className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-semibold">Your page is empty</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Add sections above to build your page. Changes are saved as drafts — click Publish to make them live.
                </p>
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
                      className={`relative group transition-all ${isSelected ? 'ring-2 ring-foreground ring-inset' : ''} ${isDragOver ? 'border-t-4 border-t-foreground' : ''} ${!section.isVisible ? 'opacity-50' : ''}`}
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
                          <button onClick={() => moveSection(section.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button onClick={() => moveSection(section.id, 'down')} disabled={idx === sections.length - 1} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button onClick={() => duplicateSection(section.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                          <button onClick={() => toggleVisible(section.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">{section.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                          <button onClick={() => delSection(section.id)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      {/* Live preview */}
                      <div className="cursor-pointer" onClick={() => setSelectedSection(section.id)}>
                        <SectionPreview section={section} categories={categories} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          💡 Drag sections to reorder · Click a section to edit · Changes are auto-saved as drafts · Click Publish to go live
        </p>
      </div>

      {/* ===== Right: Side panel ===== */}
      {selectedSectionData && (
        <div className="w-80 shrink-0">
          <div className="sticky top-24">
            <Card className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Edit Section</h3>
                </div>
                <button onClick={() => setSelectedSection(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <SectionConfigEditor
                  section={selectedSectionData}
                  categories={categories}
                  onUpdate={(config) => updateSectionConfig(selectedSectionData.id, config)}
                />
              </div>
              <div className="px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Changes auto-save. Click <strong>Publish</strong> at the top to make them live.</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Preview components ============
function SectionPreview({ section, categories }) {
  const config = typeof section.config === 'string' ? (() => { try { return JSON.parse(section.config) } catch { return {} } })() : section.config

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
    case 'announcement-bar':
      return <div className="py-2 px-4 text-center" style={{ backgroundColor: config.bg || '#1a1a1a' }}><p className="text-xs font-medium" style={{ color: config.color || '#fff' }}>{config.text || 'Announcement text...'}</p></div>
    case 'product-grid':
      return (
        <div className="p-4">
          <p className="text-sm font-semibold mb-2">{config.title || 'Product Grid'}</p>
          <div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="aspect-square rounded bg-muted/50 flex items-center justify-center"><Grid3x3 className="h-4 w-4 text-muted-foreground/50" /></div>))}</div>
          <p className="text-[10px] text-muted-foreground mt-2">Source: {config.source} · {config.limit || 8} products</p>
        </div>
      )
    case 'image-text':
      return (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-[4/3] rounded bg-muted/50 flex items-center justify-center">{config.image ? <img src={config.image} alt="" className="w-full h-full object-cover rounded" /> : <ImageIcon className="h-6 w-6 text-muted-foreground/50" />}</div>
            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold truncate">{config.title || 'Image + Text'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{config.body?.replace(/<[^>]+>/g, '')}</p>
            </div>
          </div>
        </div>
      )
    case 'marquee':
      return <div className="py-2 overflow-hidden" style={{ backgroundColor: config.bg || '#1a1a1a' }}><p className="text-xs font-medium text-center px-4 truncate" style={{ color: config.color || '#fff' }}>{config.text || 'Marquee text...'}</p></div>
    case 'text':
      return <div className={`p-4 text-${config.align || 'center'}`}><p className="text-sm font-semibold">{config.title || 'Text Block'}</p><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{config.body?.replace(/<[^>]+>/g, '')}</p></div>
    case 'image':
      return <div className="p-4">{config.url ? <img src={config.url} alt={config.alt || ''} className="w-full h-24 object-cover rounded" /> : <div className="w-full h-24 rounded bg-muted/50 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground/50" /></div>}</div>
    case 'rich-text':
      return <div className="p-4"><p className="text-sm font-semibold">{config.title || 'Rich Text'}</p><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{config.content?.replace(/<[^>]+>/g, '')}</p></div>
    case 'testimonials':
      return <div className="p-4"><p className="text-sm font-semibold mb-2">{config.title || 'Testimonials'}</p><div className="grid grid-cols-3 gap-2">{(config.items || []).slice(0, 3).map((t, i) => (<div key={i} className="p-2 rounded border border-border"><div className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`h-2 w-2 ${j < (t.rating || 5) ? 'fill-amber-500 text-amber-500' : 'text-muted'}`} />)}</div><p className="text-[10px] text-muted-foreground mt-1 truncate">{t.text}</p><p className="text-[10px] font-medium">{t.author}</p></div>))}</div></div>
    case 'faq':
      return <div className="p-4"><p className="text-sm font-semibold mb-2">{config.title || 'FAQ'}</p><div className="space-y-1">{(config.items || []).slice(0, 3).map((faq, i) => (<div key={i} className="p-2 border border-border rounded text-xs"><p className="font-medium truncate">{faq.question}</p><p className="text-muted-foreground truncate">{faq.answer}</p></div>))}</div></div>
    case 'newsletter':
      return <div className="p-4 bg-foreground text-background text-center"><p className="text-sm font-bold">{config.title || 'Newsletter'}</p><p className="text-xs opacity-80 mt-0.5">{config.subtitle}</p><div className="mt-2 inline-flex gap-1"><div className="h-6 w-24 rounded bg-background/20" /><div className="h-6 w-12 rounded bg-background" /></div></div>
    case 'discounts':
      return <div className="p-4"><p className="text-sm font-semibold mb-2">{config.title || 'Discount Codes'}</p><div className="grid grid-cols-2 gap-2">{[1, 2].map(i => (<div key={i} className="flex-1 p-2 rounded border-2 border-dashed border-border"><div className="h-2 w-12 bg-muted rounded mb-1" /><div className="h-3 w-16 bg-muted rounded" /></div>))}</div></div>
    case 'video':
      return <div className="p-4"><p className="text-sm font-semibold mb-2">{config.title || 'Video'}</p><div className="aspect-video rounded bg-black flex items-center justify-center"><Play className="h-8 w-8 text-white/50" /></div></div>
    case 'custom-html':
      return <div className="p-4"><div className="font-mono text-xs text-muted-foreground bg-muted/30 p-2 rounded line-clamp-3">{config.html || '<!-- Custom HTML -->'}</div></div>
    default:
      return <div className="p-4 text-xs text-muted-foreground">Unknown section type</div>
  }
}

function defaultConfig(type) {
  const defaults = {
    hero: { title: 'New Section', subtitle: 'Add your subtitle here', buttonText: 'Shop Now', buttonUrl: '/products', image: '', overlay: 'dark' },
    'announcement-bar': { text: 'Free shipping on all orders over $50!', bg: '#1a1a1a', color: '#ffffff' },
    'product-grid': { title: 'Products', source: 'featured', limit: 8, categoryId: '' },
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
    'custom-html': { html: '<div>\n  <p>Your custom HTML here.</p>\n</div>' }
  }
  return defaults[type] || {}
}

// ============ Section config editor (side panel) ============
function SectionConfigEditor({ section, categories, onUpdate }) {
  const config = section.config
  const set = (k, v) => onUpdate({ ...config, [k]: v })

  // Helper for testimonial/FAQ list items
  const updateListItem = (key, index, field, value) => {
    const items = [...(config[key] || [])]
    items[index] = { ...items[index], [field]: value }
    set(key, items)
  }
  const addListItem = (key, template) => {
    set(key, [...(config[key] || []), template])
  }
  const removeListItem = (key, index) => {
    set(key, (config[key] || []).filter((_, i) => i !== index))
  }

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
          <div><Label className="text-xs">Background Image</Label><FileUpload type="image" value={config.image || ''} onChange={(url) => set('image', url)} /></div>
          <div><Label className="text-xs">Overlay</Label><select value={config.overlay || 'dark'} onChange={(e) => set('overlay', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value="dark">Dark (white text)</option><option value="light">Light (dark text)</option></select></div>
        </div>
      )
    case 'announcement-bar':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Text</Label><Input value={config.text || ''} onChange={(e) => set('text', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Background</Label><input type="color" value={config.bg || '#1a1a1a'} onChange={(e) => set('bg', e.target.value)} className="w-full h-9 rounded border border-input" /></div>
            <div><Label className="text-xs">Text color</Label><input type="color" value={config.color || '#ffffff'} onChange={(e) => set('color', e.target.value)} className="w-full h-9 rounded border border-input" /></div>
          </div>
        </div>
      )
    case 'product-grid':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Source</Label><select value={config.source || 'featured'} onChange={(e) => set('source', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value="featured">Featured</option><option value="new">New Arrivals</option><option value="sale">On Sale</option><option value="all">All Products</option></select></div>
          {categories && categories.length > 0 && (
            <div><Label className="text-xs">Filter by category (optional)</Label><select value={config.categoryId || ''} onChange={(e) => set('categoryId', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          )}
          <div><Label className="text-xs">Limit</Label><Input type="number" value={config.limit || 8} onChange={(e) => set('limit', parseInt(e.target.value) || 8)} /></div>
        </div>
      )
    case 'image-text':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Body (HTML)</Label><Textarea rows={4} value={config.body || ''} onChange={(e) => set('body', e.target.value)} /></div>
          <div><Label className="text-xs">Image</Label><FileUpload type="image" value={config.image || ''} onChange={(url) => set('image', url)} /></div>
          <div><Label className="text-xs">Layout</Label><select value={config.layout || 'image-left'} onChange={(e) => set('layout', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value="image-left">Image left, text right</option><option value="image-right">Text left, image right</option></select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Button Text</Label><Input value={config.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} /></div>
            <div><Label className="text-xs">Button URL</Label><Input value={config.buttonUrl || ''} onChange={(e) => set('buttonUrl', e.target.value)} /></div>
          </div>
        </div>
      )
    case 'marquee':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Text</Label><Input value={config.text || ''} onChange={(e) => set('text', e.target.value)} /></div>
          <div><Label className="text-xs">Speed</Label><select value={config.speed || 'normal'} onChange={(e) => set('speed', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Background</Label><input type="color" value={config.bg || '#1a1a1a'} onChange={(e) => set('bg', e.target.value)} className="w-full h-9 rounded border border-input" /></div>
            <div><Label className="text-xs">Text color</Label><input type="color" value={config.color || '#ffffff'} onChange={(e) => set('color', e.target.value)} className="w-full h-9 rounded border border-input" /></div>
          </div>
        </div>
      )
    case 'text':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Body (HTML)</Label><Textarea rows={4} value={config.body || ''} onChange={(e) => set('body', e.target.value)} /></div>
          <div><Label className="text-xs">Alignment</Label><select value={config.align || 'center'} onChange={(e) => set('align', e.target.value)} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
        </div>
      )
    case 'image':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Image</Label><FileUpload type="image" value={config.url || ''} onChange={(url) => set('url', url)} /></div>
          <div><Label className="text-xs">Alt text</Label><Input value={config.alt || ''} onChange={(e) => set('alt', e.target.value)} /></div>
          <div><Label className="text-xs">Link (optional)</Label><Input value={config.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/products" /></div>
        </div>
      )
    case 'rich-text':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title (optional)</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Content (HTML)</Label><Textarea rows={8} value={config.content || ''} onChange={(e) => set('content', e.target.value)} className="font-mono text-xs" /></div>
        </div>
      )
    case 'testimonials':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          {(config.items || []).map((item, i) => (
            <div key={i} className="p-3 border border-border rounded space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-medium">#{i + 1}</span><button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
              <div><Label className="text-xs">Author</Label><Input value={item.author || ''} onChange={(e) => updateListItem('items', i, 'author', e.target.value)} /></div>
              <div><Label className="text-xs">Role (optional)</Label><Input value={item.role || ''} onChange={(e) => updateListItem('items', i, 'role', e.target.value)} /></div>
              <div><Label className="text-xs">Rating</Label><select value={item.rating || 5} onChange={(e) => updateListItem('items', i, 'rating', parseInt(e.target.value))} className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"><option value={5}>5 stars</option><option value={4}>4 stars</option><option value={3}>3 stars</option><option value={2}>2 stars</option><option value={1}>1 star</option></select></div>
              <div><Label className="text-xs">Text</Label><Textarea rows={2} value={item.text || ''} onChange={(e) => updateListItem('items', i, 'text', e.target.value)} /></div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('items', { author: 'New Author', role: '', rating: 5, text: '' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add testimonial</Button>
        </div>
      )
    case 'faq':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          {(config.items || []).map((item, i) => (
            <div key={i} className="p-3 border border-border rounded space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-medium">#{i + 1}</span><button onClick={() => removeListItem('items', i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
              <div><Label className="text-xs">Question</Label><Input value={item.question || ''} onChange={(e) => updateListItem('items', i, 'question', e.target.value)} /></div>
              <div><Label className="text-xs">Answer</Label><Textarea rows={2} value={item.answer || ''} onChange={(e) => updateListItem('items', i, 'answer', e.target.value)} /></div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('items', { question: 'New question?', answer: 'Answer here.' })}><Plus className="h-3.5 w-3.5 mr-1" /> Add FAQ</Button>
        </div>
      )
    case 'newsletter':
      return <div className="space-y-3"><div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div><div><Label className="text-xs">Subtitle</Label><Input value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div></div>
    case 'discounts':
      return <div className="space-y-3"><div><Label className="text-xs">Title</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div><p className="text-xs text-muted-foreground">Shows all active discount codes from Admin → Discounts.</p></div>
    case 'video':
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Title (optional)</Label><Input value={config.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div><Label className="text-xs">Video URL</Label><Input value={config.videoUrl || ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." /><p className="text-xs text-muted-foreground mt-1">YouTube, Vimeo, or direct video URL</p></div>
        </div>
      )
    case 'custom-html':
      return <div className="space-y-3"><div><Label className="text-xs">Custom HTML</Label><Textarea rows={8} value={config.html || ''} onChange={(e) => set('html', e.target.value)} className="font-mono text-xs" /></div></div>
    default:
      return <p className="text-xs text-muted-foreground">No editor for this section type.</p>
  }
}
