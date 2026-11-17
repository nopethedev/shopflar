'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  SECTION_CATALOG, GROUPS, defaultConfig, TEMPLATES,
  SectionPreview, SectionConfigEditor, DesignEditor
} from './builder-parts'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  X, Plus, Search, GripVertical, Eye, EyeOff, Trash2, Copy, ArrowUp, ArrowDown,
  Monitor, Tablet, Smartphone, Undo2, Redo2, Upload, RotateCcw, ExternalLink,
  MousePointerClick, Layers, Lock, ChevronDown, RefreshCw, Sparkles, Settings2,
  PanelLeft, Globe, Save, Check
} from 'lucide-react'

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', width: '100%' },
  { id: 'tablet', icon: Tablet, label: 'Tablet', width: 834 },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', width: 390 }
]

const configOf = (section: any) => {
  if (!section) return {}
  if (typeof section.config === 'string') {
    try { return JSON.parse(section.config) } catch { return {} }
  }
  return section.config || {}
}

const metaFor = (type: string) => SECTION_CATALOG.find(t => t.type === type)

const subtitleFor = (section: any) => {
  const c = configOf(section)
  if (c.title) return String(c.title).replace(/<[^>]+>/g, '')
  if (c.text) return String(c.text)
  if (c.content) return String(c.content).replace(/<[^>]+>/g, '')
  return ''
}

export function PageBuilder({
  initialSections,
  categories,
  pageType = 'home',
  pageId = null,
  themeName = 'Dawn',
  pageLabel = 'Home page',
  publicPath = '/',
  initialDirty = false,
  pages = []
}) {
  const router = useRouter()
  const [sections, setSections] = useState<any[]>(initialSections)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [device, setDevice] = useState('desktop')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [leftTab, setLeftTab] = useState<'sections' | 'add'>('sections')
  const [rightTab, setRightTab] = useState('content')
  const [dirty, setDirty] = useState(initialDirty)
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(0)
  const [paletteSearch, setPaletteSearch] = useState('')
  const [addingType, setAddingType] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [paletteOver, setPaletteOver] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [host, setHost] = useState('your-store')

  const historyRef = useRef<string[]>([])
  const futureRef = useRef<string[]>([])
  const [histCount, setHistCount] = useState(0)
  const [futureCount, setFutureCount] = useState(0)
  const timersRef = useRef<Record<string, any>>({})

  const selected = sections.find(s => s.id === selectedId) || null
  const deviceMeta = DEVICES.find(d => d.id === device) || DEVICES[0]

  useEffect(() => {
    setHost(window.location.host)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const pushHistory = useCallback(() => {
    historyRef.current.push(JSON.stringify(sections))
    if (historyRef.current.length > 60) historyRef.current.shift()
    futureRef.current = []
    setHistCount(historyRef.current.length)
    setFutureCount(0)
  }, [sections])

  const flushSections = useCallback(async (list: any[]) => {
    await Promise.all(list.map((s, i) =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configOf(s), sortOrder: i })
      }).catch(() => null)
    ))
  }, [])

  const scheduleSave = useCallback((id: string, config: any) => {
    setSaving(v => v + 1)
    clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(async () => {
      try {
        await fetch(`/api/admin/sections/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        })
      } catch (e) {
        console.error('Autosave failed', e)
      } finally {
        setSaving(v => Math.max(0, v - 1))
      }
    }, 650)
  }, [])

  const updateConfig = (id: string, config: any) => {
    pushHistory()
    setSections(prev => prev.map(s => s.id === id ? { ...s, config } : s))
    scheduleSave(id, config)
    setDirty(true)
  }

  const applySnapshot = (snapshot: string) => {
    const next = JSON.parse(snapshot)
    setSections(next)
    setDirty(true)
    flushSections(next)
  }

  const undo = () => {
    if (!historyRef.current.length) return
    futureRef.current.push(JSON.stringify(sections))
    applySnapshot(historyRef.current.pop() as string)
    setHistCount(historyRef.current.length)
    setFutureCount(futureRef.current.length)
  }

  const redo = () => {
    if (!futureRef.current.length) return
    historyRef.current.push(JSON.stringify(sections))
    applySnapshot(futureRef.current.pop() as string)
    setHistCount(historyRef.current.length)
    setFutureCount(futureRef.current.length)
  }

  useEffect(() => {
    const h = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const persistOrder = (ordered: any[]) => {
    Promise.all(ordered.map((s, i) =>
      fetch(`/api/admin/sections/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: i })
      })
    ))
  }

  const addSection = async (type: string, index = sections.length) => {
    setAddingType(type)
    try {
      const r = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType, pageId, sectionType: type,
          config: defaultConfig(type), sortOrder: index, isVisible: true
        })
      })
      if (!r.ok) throw new Error('Could not add section')
      const d = await r.json()
      const newSection = { ...d.section, config: configOf(d.section) }
      setSections(prev => {
        const next = [...prev.slice(0, index), newSection, ...prev.slice(index)]
        return next.map((s, i) => ({ ...s, sortOrder: i }))
      })
      setSelectedId(newSection.id)
      setRightTab('content')
      setLeftTab('sections')
      setDirty(true)
      toast.success(`${metaFor(type)?.label || 'Section'} added`, 'Drag it to position — then publish')
    } catch (e: any) {
      toast.error('Failed to add section', e.message)
    } finally {
      setAddingType(null)
    }
  }

  const applyTemplate = async (template: any) => {
    setShowTemplates(false)
    const created: any[] = []
    for (const type of template.sections) {
      try {
        const r = await fetch('/api/admin/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageType, pageId, sectionType: type, config: defaultConfig(type), sortOrder: 999, isVisible: true })
        })
        if (r.ok) {
          const d = await r.json()
          created.push({ ...d.section, config: configOf(d.section) })
        }
      } catch {}
    }
    if (created.length) {
      setSections(prev => [...prev, ...created].map((s, i) => ({ ...s, sortOrder: i })))
      persistOrder([...sections, ...created])
      setDirty(true)
      setSelectedId(created[0].id)
      toast.success(`${template.name} applied`, `${created.length} sections added below`)
    }
  }

  const toggleVisible = async (id: string) => {
    const section = sections.find(s => s.id === id)
    if (!section) return
    const next = !section.isVisible
    setSections(prev => prev.map(s => s.id === id ? { ...s, isVisible: next } : s))
    setDirty(true)
    try {
      await fetch(`/api/admin/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: next })
      })
    } catch { toast.error('Could not update visibility') }
  }

  const duplicateSection = async (id: string) => {
    const idx = sections.findIndex(s => s.id === id)
    if (idx < 0) return
    try {
      const r = await fetch(`/api/admin/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicate: true })
      })
      if (!r.ok) throw new Error('Duplicate failed')
      const d = await r.json()
      const copy = { ...d.section, config: configOf(d.section) }
      setSections(prev => {
        const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
        const ordered = next.map((s, i) => ({ ...s, sortOrder: i }))
        persistOrder(ordered)
        return ordered
      })
      setSelectedId(copy.id)
      setDirty(true)
      toast.success('Section duplicated')
    } catch (e: any) {
      toast.error('Could not duplicate', e.message)
    }
  }

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex(s => s.id === id)
    const to = idx + dir
    if (idx < 0 || to < 0 || to >= sections.length) return
    pushHistory()
    const next = arrayMove(sections, idx, to).map((s, i) => ({ ...s, sortOrder: i }))
    setSections(next)
    persistOrder(next)
    setDirty(true)
  }

  const removeSection = async (id: string) => {
    if (!confirm('Remove this section? It disappears from the storefront when you publish.')) return
    try {
      const r = await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Delete failed')
      setSections(prev => prev.filter(s => s.id !== id))
      if (selectedId === id) setSelectedId(null)
      setDirty(true)
      toast.success('Section removed')
    } catch (e: any) {
      toast.error('Could not remove section', e.message)
    }
  }

  const publishChanges = async () => {
    setPublishing(true)
    try {
      await flushSections(sections)
      const r = await fetch('/api/admin/sections/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageId, action: 'publish' })
      })
      if (!r.ok) throw new Error('Publish failed')
      setDirty(false)
      setPreviewKey(k => k + 1)
      toast.success('Published', 'Your storefront is updated')
      router.refresh()
    } catch (e: any) {
      toast.error('Publish failed', e.message)
    } finally {
      setPublishing(false)
    }
  }

  const discardChanges = async () => {
    if (!confirm('Discard all unpublished changes and restore the last published version?')) return
    setPublishing(true)
    try {
      const r = await fetch('/api/admin/sections/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageId, action: 'discard' })
      })
      if (!r.ok) throw new Error('Discard failed')
      const params = new URLSearchParams({ pageType, includeDraft: 'false' })
      if (pageId) params.set('pageId', pageId)
      const sr = await fetch(`/api/admin/sections?${params}`)
      const sd = await sr.json()
      setSections(sd.sections.map((s: any) => ({ ...s, config: configOf(s) })))
      setSelectedId(null)
      setDirty(false)
      setPreviewKey(k => k + 1)
      toast.success('Changes discarded')
    } catch (e: any) {
      toast.error('Discard failed', e.message)
    } finally {
      setPublishing(false)
    }
  }

  const openPreview = async () => {
    await flushSections(sections)
    setMode('preview')
    setSelectedId(null)
    setPreviewKey(k => k + 1)
  }

  const onDragEnd = ({ active, over }) => {
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    const from = sections.findIndex(s => s.id === active.id)
    const to = sections.findIndex(s => s.id === over.id)
    if (from < 0 || to < 0) return
    pushHistory()
    const next = arrayMove(sections, from, to).map((s, i) => ({ ...s, sortOrder: i }))
    setSections(next)
    persistOrder(next)
    setDirty(true)
  }

  const onPaletteDrop = async (e) => {
    e.preventDefault()
    setPaletteOver(false)
    const type = e.dataTransfer.getData('application/x-section-type') || e.dataTransfer.getData('text/plain')
    if (type && metaFor(type)) await addSection(type, sections.length)
  }

  const paletteItems = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase()
    return SECTION_CATALOG.filter(t => !q || t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [paletteSearch])

  const pageValue = pageType === 'custom' && pageId ? `custom:${pageId}` : 'home'
  const switchPage = (value: string) => {
    if (value === 'home') router.push('/admin/builder')
    else {
      const id = value.split(':')[1]
      router.push(`/admin/builder?pageType=custom&pageId=${id}`)
    }
  }

  const previewSrc = `${publicPath}${publicPath.includes('?') ? '&' : '?'}preview=1&t=${previewKey}`

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f1f1f1] admin-shell">
      {/* ===== Top bar ===== */}
      <header className="h-14 shrink-0 bg-[#1a1a1a] text-white flex items-center justify-between gap-3 px-3 md:px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/admin/themes" className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white" title="Close editor">
            <X className="h-4 w-4" />
          </Link>
          <span className="hidden sm:block h-6 w-px bg-white/15" />
          <div className="relative min-w-0">
            <select
              value={pageValue}
              onChange={(e) => switchPage(e.target.value)}
              className="appearance-none bg-transparent text-[13px] font-medium text-white pr-6 pl-1 py-1 rounded-md hover:bg-white/10 cursor-pointer outline-none max-w-[220px] truncate"
              aria-label="Choose page to edit"
            >
              <option value="home" className="text-[#1a1a1a]">Home page</option>
              {pages.map((p: any) => (
                <option key={p.id} value={`custom:${p.id}`} className="text-[#1a1a1a]">
                  {p.title}{p.status === 'DRAFT' ? ' (draft)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/60 pointer-events-none" />
          </div>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/50 border border-white/15 rounded px-1.5 py-0.5">
            {themeName}
          </span>
          {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Unpublished changes" />}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
            {DEVICES.map(d => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                title={`${d.label} preview`}
                className={cn('p-1.5 rounded-md transition-colors', device === d.id ? 'bg-white text-[#1a1a1a]' : 'text-white/70 hover:text-white')}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <span className="hidden sm:block h-6 w-px bg-white/15 mx-0.5" />
          <button onClick={undo} disabled={!histCount} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30" title="Undo (⌘Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={redo} disabled={!futureCount} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30" title="Redo (⇧⌘Z)">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden md:flex items-center gap-1 text-[11px] text-white/60 mr-1">
            {saving > 0 ? <><Save className="h-3 w-3 animate-pulse" /> Saving…</> : !dirty ? <><Check className="h-3 w-3 text-emerald-400" /> Saved</> : null}
          </span>
          <button
            onClick={discardChanges}
            disabled={!dirty || publishing}
            className="hidden md:inline-flex p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30"
            title="Discard unpublished changes"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => mode === 'preview' ? setMode('edit') : openPreview()}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium border transition-colors',
              mode === 'preview' ? 'bg-white text-[#1a1a1a] border-white' : 'border-white/25 hover:bg-white/10'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mode === 'preview' ? 'Exit preview' : 'Preview'}</span>
          </button>
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-white/25 text-[12px] hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Store
          </a>
          <button
            onClick={publishChanges}
            disabled={publishing || !dirty}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-white text-[#1a1a1a] text-[12px] font-semibold hover:bg-white/90 disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" /> {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* ===== Left panel ===== */}
        <aside className="w-full lg:w-[280px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#e3e3e3] flex flex-col lg:min-h-0">
          <div className="flex items-center gap-1 px-2 pt-2">
            <button
              onClick={() => setLeftTab('sections')}
              className={cn('flex-1 h-8 rounded-md text-[12px] font-medium transition-colors', leftTab === 'sections' ? 'bg-[#1a1a1a] text-white' : 'text-[#303030] hover:bg-[#f1f1f1]')}
            >
              Sections
            </button>
            <button
              onClick={() => setLeftTab('add')}
              className={cn('flex-1 h-8 rounded-md text-[12px] font-medium transition-colors', leftTab === 'add' ? 'bg-[#1a1a1a] text-white' : 'text-[#303030] hover:bg-[#f1f1f1]')}
            >
              Add
            </button>
          </div>

          {leftTab === 'sections' ? (
            <div className="flex-1 lg:min-h-0 flex flex-col">
              <div className="px-3 py-2.5 border-b border-[#efefef]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">Page structure</p>
                  <span className="text-[10px] text-[#8a8a8a]">{sections.length}</span>
                </div>
                <p className="text-[11px] text-[#8a8a8a] mt-0.5 truncate">{pageLabel}</p>
              </div>

              <div className="flex-1 lg:overflow-y-auto p-2 space-y-0.5">
                <GlobalRow label="Header" hint="Navigation & branding" />
                {sections.length === 0 && (
                  <div className="px-2 py-6 text-center">
                    <LayoutIcon />
                    <p className="text-[12px] font-medium text-[#1a1a1a] mt-2">Nothing here yet</p>
                    <button onClick={() => setLeftTab('add')} className="text-[11px] text-[#005bd3] hover:underline mt-0.5">Add your first section</button>
                  </div>
                )}
                {sections.map((section, idx) => {
                  const meta = metaFor(section.sectionType)
                  const Icon = meta?.icon || Layers
                  const isSelected = selectedId === section.id
                  return (
                    <div
                      key={section.id}
                      onClick={() => { setSelectedId(section.id); setRightTab('content'); setMode('edit') }}
                      className={cn(
                        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border',
                        isSelected ? 'bg-[#f0f6ff] border-[#b5d1ff]' : 'border-transparent hover:bg-[#f7f7f7]',
                        !section.isVisible && 'opacity-55'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 text-[#616161] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-[#1a1a1a] truncate leading-tight">{meta?.label || section.sectionType}</p>
                        {subtitleFor(section) && (
                          <p className="text-[10px] text-[#8a8a8a] truncate leading-tight mt-0.5">{subtitleFor(section)}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisible(section.id) }}
                        className="p-1 rounded text-[#8a8a8a] hover:text-[#1a1a1a] hover:bg-[#ececec] opacity-0 group-hover:opacity-100"
                        title={section.isVisible ? 'Hide section' : 'Show section'}
                        aria-label={section.isVisible ? 'Hide section' : 'Show section'}
                      >
                        {section.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                    </div>
                  )
                })}
                <GlobalRow label="Footer" hint="Navigation & branding" />
              </div>

              <div className="p-2 border-t border-[#efefef] space-y-1.5">
                <button
                  onClick={() => setLeftTab('add')}
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-[#c9c9c9] text-[12px] font-medium text-[#303030] hover:border-[#8a8a8a] hover:bg-[#fafafa]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add section
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => setShowTemplates(true)} className="sf-btn sf-btn-secondary !h-7 !text-[11px]">
                    <Sparkles className="h-3 w-3" /> Templates
                  </button>
                  <Link href="/admin/appearance" className="sf-btn sf-btn-secondary !h-7 !text-[11px]">
                    <Settings2 className="h-3 w-3" /> Styles
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 lg:min-h-0 flex flex-col">
              <div className="p-2 border-b border-[#efefef]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a8a8a]" />
                  <input
                    value={paletteSearch}
                    onChange={(e) => setPaletteSearch(e.target.value)}
                    placeholder="Search blocks"
                    className="sf-input pl-8"
                    aria-label="Search blocks"
                  />
                </div>
                <p className="text-[10px] text-[#8a8a8a] mt-1.5 flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" /> Click to add, or drag onto the page
                </p>
              </div>
              <div className="flex-1 lg:overflow-y-auto p-2 space-y-3">
                {GROUPS.map(group => {
                  const items = paletteItems.filter(t => t.group === group)
                  if (!items.length) return null
                  return (
                    <div key={group}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8a8a] px-1 mb-1">{group}</p>
                      <div className="space-y-1">
                        {items.map(t => (
                          <button
                            key={t.type}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/x-section-type', t.type)
                              e.dataTransfer.setData('text/plain', t.type)
                              e.dataTransfer.effectAllowed = 'copy'
                            }}
                            onDragEnd={() => setPaletteOver(false)}
                            onClick={() => addSection(t.type)}
                            disabled={addingType === t.type}
                            className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-[#e9e9e9] bg-white text-left hover:border-[#b5b5b5] hover:shadow-sm transition-all disabled:opacity-50 cursor-grab active:cursor-grabbing"
                          >
                            <span className="h-8 w-8 rounded-md bg-[#f4f4f4] flex items-center justify-center shrink-0">
                              <t.icon className="h-4 w-4 text-[#303030]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-medium text-[#1a1a1a] truncate">{t.label}</span>
                              <span className="block text-[10px] text-[#8a8a8a] truncate">{t.description}</span>
                            </span>
                            {addingType === t.type ? (
                              <RefreshCw className="h-3 w-3 animate-spin text-[#8a8a8a]" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 text-[#8a8a8a] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {paletteItems.length === 0 && (
                  <p className="text-[12px] text-[#8a8a8a] text-center py-6">No blocks match “{paletteSearch}”.</p>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ===== Canvas ===== */}
        <main className="flex-1 min-w-0 flex flex-col bg-[#e9e9e9]">
          <div className="flex-1 min-h-0 overflow-auto p-3 md:p-6">
            <div
              className="mx-auto transition-[max-width] duration-300"
              style={{ maxWidth: deviceMeta.width === '100%' ? '100%' : deviceMeta.width }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 h-9 px-3 rounded-t-xl bg-[#f7f7f7] border border-[#dcdcdc] border-b-0">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 max-w-full px-3 h-6 rounded-md bg-white border border-[#e3e3e3] text-[11px] text-[#616161] truncate">
                    <Lock className="h-2.5 w-2.5" />
                    {host}{publicPath}
                    {mode === 'preview' && <span className="text-[#8a8a8a]">{pageType === 'home' ? ' · draft preview' : ' · published'}</span>}
                  </span>
                </div>
                <button onClick={() => setPreviewKey(k => k + 1)} className="p-1 rounded hover:bg-[#e9e9e9]" title="Reload preview" aria-label="Reload preview">
                  <RefreshCw className="h-3 w-3 text-[#616161]" />
                </button>
              </div>

              {mode === 'preview' ? (
                <div className="bg-white border border-[#dcdcdc] rounded-b-xl overflow-hidden">
                  <iframe
                    key={previewKey}
                    src={previewSrc}
                    title="Storefront preview"
                    className="w-full bg-white block"
                    style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'bg-white border border-[#dcdcdc] rounded-b-xl overflow-hidden relative',
                    paletteOver && 'ring-2 ring-[#005bd3]'
                  )}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/x-section-type')) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'copy'
                      setPaletteOver(true)
                    }
                  }}
                  onDragLeave={() => setPaletteOver(false)}
                  onDrop={onPaletteDrop}
                >
                  {sections.length === 0 ? (
                    <div className="px-8 py-20 text-center">
                      <div className="h-12 w-12 rounded-xl bg-[#f1f1f1] flex items-center justify-center mx-auto mb-3">
                        <Layers className="h-6 w-6 text-[#8a8a8a]" />
                      </div>
                      <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Start building your page</h3>
                      <p className="text-[12px] text-[#8a8a8a] mt-1 max-w-sm mx-auto">
                        Drag a block in from the Add panel, or begin with a template.
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <button onClick={() => setLeftTab('add')} className="sf-btn sf-btn-primary"><Plus className="h-3.5 w-3.5" /> Add section</button>
                        <button onClick={() => setShowTemplates(true)} className="sf-btn sf-btn-secondary"><Sparkles className="h-3.5 w-3.5" /> Use a template</button>
                      </div>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={({ active }) => { setActiveDragId(active.id as string); setSelectedId(active.id as string) }}
                      onDragEnd={onDragEnd}
                      onDragCancel={() => setActiveDragId(null)}
                    >
                      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {sections.map((section, idx) => (
                          <SortableBlock
                            key={section.id}
                            id={section.id}
                            index={idx}
                            total={sections.length}
                            selected={selectedId === section.id}
                            hidden={!section.isVisible}
                            type={section.sectionType}
                            meta={metaFor(section.sectionType)}
                            onSelect={() => { setSelectedId(section.id); setRightTab('content') }}
                            onMove={moveSection}
                            onDuplicate={duplicateSection}
                            onToggleVisible={toggleVisible}
                            onRemove={removeSection}
                            dragging={activeDragId === section.id}
                          >
                            <SectionPreview section={section} categories={categories} mobile={device === 'mobile'} />
                          </SortableBlock>
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}

                  {sections.length > 0 && (
                    <div
                      className={cn(
                        'm-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 py-4 transition-colors',
                        paletteOver ? 'border-[#005bd3] bg-[#f0f6ff] text-[#005bd3]' : 'border-[#e3e3e3] text-[#8a8a8a]'
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-[12px] font-medium">
                        {paletteOver ? 'Drop to add the block' : 'Drag a block here to add it'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#8a8a8a] text-center mt-3">
              {mode === 'preview'
                ? pageType === 'home'
                  ? 'Previewing the real storefront with your draft changes · only admins can see this'
                  : 'Previewing the published page · publish your edits to see them here'
                : 'Drag sections to reorder · click to edit · ⌘Z undo · changes autosave as drafts'}
            </p>
          </div>
        </main>

        {/* ===== Inspector ===== */}
        <aside className="w-full lg:w-[340px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-[#e3e3e3] flex flex-col lg:min-h-0">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-[#e3e3e3] flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#8a8a8a]">Section</p>
                  <h2 className="text-[14px] font-semibold text-[#1a1a1a] truncate">
                    {metaFor(selected.sectionType)?.label || selected.sectionType}
                  </h2>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <IconBtn title="Move up" disabled={sections.findIndex(s => s.id === selected.id) === 0} onClick={() => moveSection(selected.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Move down" disabled={sections.findIndex(s => s.id === selected.id) === sections.length - 1} onClick={() => moveSection(selected.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Duplicate" onClick={() => duplicateSection(selected.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title={selected.isVisible ? 'Hide' : 'Show'} onClick={() => toggleVisible(selected.id)}>{selected.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
                  <IconBtn title="Remove" danger onClick={() => removeSection(selected.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Close" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></IconBtn>
                </div>
              </div>

              <div className="flex border-b border-[#e3e3e3]">
                {['content', 'design'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={cn(
                      'flex-1 h-9 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors',
                      rightTab === tab ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-[#616161] hover:text-[#1a1a1a]'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 lg:overflow-y-auto p-4">
                {rightTab === 'content' ? (
                  <SectionConfigEditor
                    section={selected}
                    categories={categories}
                    device={device === 'mobile' ? 'mobile' : 'desktop'}
                    setDevice={(d) => setDevice(d)}
                    onUpdate={(config) => updateConfig(selected.id, config)}
                  />
                ) : (
                  <DesignEditor
                    config={configOf(selected)}
                    sectionType={selected.sectionType}
                    onUpdate={(design) => updateConfig(selected.id, { ...configOf(selected), design })}
                  />
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-[#e3e3e3]">
                <p className="text-[11px] text-[#8a8a8a]">{saving > 0 ? 'Saving draft…' : 'Draft saved automatically'}{dirty ? ' · not published' : ''}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 lg:overflow-y-auto">
              <div className="px-4 py-3 border-b border-[#e3e3e3]">
                <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Page settings</h2>
                <p className="text-[11px] text-[#8a8a8a] mt-0.5">{pageLabel}</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-lg border border-[#e3e3e3] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-medium text-[#1a1a1a]">{themeName}</p>
                      <p className="text-[11px] text-[#8a8a8a]">Active theme</p>
                    </div>
                    <Link href="/admin/themes" className="sf-btn sf-btn-secondary !h-7 !text-[11px]">Change</Link>
                  </div>
                </div>
                <div className="rounded-lg border border-[#e3e3e3] p-3 space-y-2">
                  <p className="text-[12px] font-medium text-[#1a1a1a]">{sections.length} sections</p>
                  {sections.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className="w-full flex items-center justify-between gap-2 text-left text-[11px] text-[#616161] hover:text-[#1a1a1a]"
                    >
                      <span className="truncate">{i + 1}. {metaFor(s.sectionType)?.label || s.sectionType}</span>
                      <ChevronDown className="h-3 w-3 -rotate-90 shrink-0" />
                    </button>
                  ))}
                </div>
                <div className="rounded-lg bg-[#f7f7f7] p-3">
                  <p className="text-[11px] font-medium text-[#303030] flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> Editing tips</p>
                  <ul className="text-[11px] text-[#616161] mt-1.5 space-y-1 list-disc pl-4">
                    <li>Click any section on the canvas to edit it.</li>
                    <li>Drag the grip handle to reorder sections.</li>
                    <li>Drag blocks from Add onto the page.</li>
                    <li>Publish when you are ready to go live.</li>
                  </ul>
                </div>
                <button onClick={() => setShowTemplates(true)} className="sf-btn sf-btn-secondary w-full">
                  <Sparkles className="h-3.5 w-3.5" /> Browse templates
                </button>
                <Link href="/admin/appearance" className="sf-btn sf-btn-secondary w-full">
                  <Settings2 className="h-3.5 w-3.5" /> Colors & typography
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Templates dialog */}
      {showTemplates && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e3e3e3]">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Starter templates</h2>
                <p className="text-[11px] text-[#8a8a8a]">Sections are added below your current content.</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-1.5 rounded-md hover:bg-[#f1f1f1]" aria-label="Close templates">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left p-3.5 rounded-lg border border-[#e3e3e3] hover:border-[#8a8a8a] hover:bg-[#fafafa] transition-colors"
                >
                  <p className="text-[13px] font-semibold text-[#1a1a1a]">{t.name}</p>
                  <p className="text-[11px] text-[#616161] mt-0.5">{t.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.sections.map((type, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#f1f1f1] text-[#616161]">
                        {metaFor(type)?.label || type}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LayoutIcon() {
  return <Layers className="h-5 w-5 text-[#b5b5b5] mx-auto" />
}

function GlobalRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#8a8a8a]" title={`${label} is global — edit it in ${hint}`}>
      <Lock className="h-3 w-3 shrink-0" />
      <span className="text-[12px] flex-1">{label}</span>
      <span className="text-[9px] uppercase tracking-wide">Global</span>
    </div>
  )
}

function IconBtn({ title, onClick, disabled, danger, children }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'p-1.5 rounded-md text-[#616161] hover:bg-[#f1f1f1] hover:text-[#1a1a1a] disabled:opacity-30',
        danger && 'hover:bg-rose-50 hover:text-rose-600'
      )}
    >
      {children}
    </button>
  )
}

function SortableBlock({ id, index, total, selected, hidden, type, meta, onSelect, onMove, onDuplicate, onToggleVisible, onRemove, dragging, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const Icon = meta?.icon || Layers
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: dragging || isDragging ? 0.45 : 1,
    zIndex: isDragging ? 30 : undefined,
    position: 'relative' as const
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group/sec relative transition-shadow',
        selected ? 'ring-2 ring-inset ring-[#005bd3] z-[1]' : 'hover:ring-1 hover:ring-inset hover:ring-[#005bd3]/40',
        hidden && 'opacity-55'
      )}
    >
      {/* Section label chip */}
      <div
        className={cn(
          'absolute top-0 left-0 z-20 flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-br-md text-[10px] font-medium shadow-sm transition-opacity',
          selected ? 'bg-[#005bd3] text-white' : 'bg-[#e7f0ff] text-[#0b4a9e] opacity-0 group-hover/sec:opacity-100'
        )}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-0.5 cursor-grab active:cursor-grabbing rounded hover:bg-white/20"
          title="Drag to reorder"
          aria-label={`Reorder ${meta?.label || type}`}
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <Icon className="h-3 w-3" />
        <span className="max-w-[140px] truncate">{meta?.label || type}</span>
        {hidden && <span className="opacity-80">· hidden</span>}
      </div>

      {/* Quick actions */}
      <div
        className={cn(
          'absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 bg-[#1a1a1a]/95 text-white rounded-lg shadow-lg px-0.5 py-0.5 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover/sec:opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <ChipBtn title="Move up" disabled={index === 0} onClick={() => onMove(id, -1)}><ArrowUp className="h-3 w-3" /></ChipBtn>
        <ChipBtn title="Move down" disabled={index === total - 1} onClick={() => onMove(id, 1)}><ArrowDown className="h-3 w-3" /></ChipBtn>
        <ChipBtn title="Duplicate" onClick={() => onDuplicate(id)}><Copy className="h-3 w-3" /></ChipBtn>
        <ChipBtn title={hidden ? 'Show' : 'Hide'} onClick={() => onToggleVisible(id)}>{hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</ChipBtn>
        <ChipBtn title="Remove" danger onClick={() => onRemove(id)}><Trash2 className="h-3 w-3" /></ChipBtn>
      </div>

      {children}
    </div>
  )
}

function ChipBtn({ title, onClick, disabled, danger, children }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn('p-1 rounded-md disabled:opacity-30', danger ? 'hover:bg-rose-500' : 'hover:bg-white/15')}
    >
      {children}
    </button>
  )
}
