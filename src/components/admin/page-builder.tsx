'use client'
// Theme editor.
//
// The canvas is the *real* storefront, rendered by the server in an iframe
// (`?preview=1`, admin-only) — so what you edit is exactly what shoppers get,
// at the real breakpoints. The iframe talks back through PreviewBridge:
// clicking a section selects it here, and every save triggers a soft refresh
// that keeps the scroll position.
//
// Editing model: every change is applied locally first (instant), pushed to
// the server as a *draft* in debounced batches, and only goes live when you
// press Publish. Undo/redo operates on whole snapshots, including adding,
// removing, hiding and reordering sections.
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
  SectionConfigEditor, DesignEditor, EditorContext
} from './builder-parts'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  X, Plus, Search, GripVertical, Eye, EyeOff, Trash2, Copy, ArrowUp, ArrowDown,
  Monitor, Tablet, Smartphone, Undo2, Redo2, Upload, RotateCcw, ExternalLink,
  MousePointerClick, Layers, Lock, ChevronDown, RefreshCw, Sparkles, Settings2,
  PanelLeft, PanelRight, Save, Check, AlertTriangle, Loader2
} from 'lucide-react'

const DEVICES = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', width: '100%' },
  { id: 'tablet', icon: Tablet, label: 'Tablet', width: 834 },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', width: 390 }
]

type Sec = {
  id: string
  sectionType: string
  config: Record<string, any>
  isVisible: boolean
  isDeleted?: boolean
  [key: string]: any
}

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const metaFor = (type: string) => SECTION_CATALOG.find(t => t.type === type)

const subtitleFor = (section: Sec) => {
  const c = section.config || {}
  const raw = c.title || c.text || c.content || c.body || c.html || ''
  return String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const isTyping = (el: EventTarget | null) => {
  const node = el as HTMLElement | null
  if (!node) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.isContentEditable
}

const normalize = (s: any): Sec => ({
  ...s,
  config: s.config && typeof s.config === 'object' ? s.config : {},
  isVisible: s.isVisible !== false,
  isDeleted: false
})

export function PageBuilder({
  initialSections,
  categories = [],
  products = [],
  pageType = 'home',
  pageId = null,
  themeName = 'Dawn',
  pageLabel = 'Home page',
  publicPath = '/',
  initialDirty = false,
  pages = []
}: any) {
  const router = useRouter()
  const [sections, setSections] = useState<Sec[]>(() => initialSections.map(normalize))
  const sectionsRef = useRef<Sec[]>(sections)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [device, setDevice] = useState('desktop')
  const [leftTab, setLeftTab] = useState<'sections' | 'add'>('sections')
  const [rightTab, setRightTab] = useState('content')
  const [dirty, setDirty] = useState(initialDirty)
  const [publishing, setPublishing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [paletteSearch, setPaletteSearch] = useState('')
  const [addingType, setAddingType] = useState<string | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showLeft, setShowLeft] = useState(true)
  const [showRight, setShowRight] = useState(true)
  const [previewKey, setPreviewKey] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [host, setHost] = useState('your-store')
  const [notice, setNotice] = useState<{ text: string; undo?: boolean } | null>(null)

  // history = snapshots of the full section list
  const past = useRef<Sec[][]>([])
  const future = useRef<Sec[][]>([])
  const lastEdit = useRef<{ key: string | null; t: number }>({ key: null, t: 0 })
  const [histSize, setHistSize] = useState({ past: 0, future: 0 })
  const bumpHistory = useCallback(() => setHistSize({ past: past.current.length, future: future.current.length }), [])

  // sync machinery
  const dirtyIds = useRef<Set<string>>(new Set())
  const needsSync = useRef(false)
  const syncTimer = useRef<any>(null)
  const retryTimer = useRef<any>(null)
  const syncing = useRef<Promise<boolean> | null>(null)
  const syncRef = useRef<(() => Promise<boolean>) | null>(null)
  const noticeTimer = useRef<any>(null)

  // preview iframe
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewReady = useRef(false)
  const refreshTimer = useRef<any>(null)

  const visible = useMemo(() => sections.filter(s => !s.isDeleted), [sections])
  const selected = visible.find(s => s.id === selectedId) || null
  const deviceMeta = DEVICES.find(d => d.id === device) || DEVICES[0]

  const editorCtx = useMemo(() => ({
    categories,
    products,
    links: [
      { value: '/', label: 'Home' },
      { value: '/products', label: 'All products' },
      { value: '/products?sale=true', label: 'Sale' },
      { value: '/products?new=true', label: 'New arrivals' },
      { value: '/cart', label: 'Cart' },
      { value: '/contact', label: 'Contact' },
      { value: '/about', label: 'About' },
      ...categories.map((c: any) => ({ value: `/categories/${c.slug}`, label: `Category: ${c.name}` })),
      ...pages.map((p: any) => ({ value: `/pages/${p.slug}`, label: `Page: ${p.title}` })),
      ...products.slice(0, 60).map((p: any) => ({ value: `/products/${p.slug}`, label: `Product: ${p.name}` }))
    ]
  }), [categories, products, pages])

  // ------------------------------------------------------------
  // Preview iframe plumbing
  // ------------------------------------------------------------
  const postToPreview = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'sf-editor', ...message }, window.location.origin)
  }, [])

  const refreshPreview = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      if (previewReady.current) postToPreview({ type: 'refresh' })
      else setPreviewKey(k => k + 1)
    }, 120)
  }, [postToPreview])

  // ------------------------------------------------------------
  // Syncing drafts to the server
  // ------------------------------------------------------------
  const syncNow = useCallback((): Promise<boolean> => {
    clearTimeout(syncTimer.current)
    clearTimeout(retryTimer.current)
    if (syncing.current) return syncing.current

    const run = async (): Promise<boolean> => {
      while (needsSync.current) {
        needsSync.current = false
        const snapshot = sectionsRef.current
        const sendConfig = new Set(dirtyIds.current)
        dirtyIds.current = new Set()
        setSaveState('saving')
        try {
          const r = await fetch('/api/admin/sections/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageType, pageId,
              items: snapshot.map(s => ({
                id: s.id,
                isVisible: s.isVisible,
                isDeleted: !!s.isDeleted,
                ...(sendConfig.has(s.id) ? { config: s.config } : {})
              }))
            })
          })
          if (!r.ok) {
            const d = await r.json().catch(() => ({}))
            throw new Error(d.error || `HTTP ${r.status}`)
          }
        } catch (e: any) {
          // Put everything back and try again shortly — never silently drop an edit
          sendConfig.forEach(id => dirtyIds.current.add(id))
          needsSync.current = true
          setSaveState('error')
          retryTimer.current = setTimeout(() => { syncRef.current?.() }, 5000)
          return false
        }
      }
      setSaveState('saved')
      refreshPreview()
      return true
    }

    const p = run().finally(() => { syncing.current = null })
    syncing.current = p
    return p
  }, [pageType, pageId, refreshPreview])

  useEffect(() => { syncRef.current = syncNow }, [syncNow])

  const scheduleSync = useCallback((delay = 600) => {
    needsSync.current = true
    setSaveState('pending')
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => { syncNow() }, delay)
  }, [syncNow])

  // Every state change goes through here.
  const commit = useCallback((
    next: Sec[],
    opts: { history?: boolean; key?: string; dirty?: string[]; all?: boolean; immediate?: boolean } = {}
  ) => {
    const { history = true, key, dirty: ids = [], all = false, immediate = false } = opts
    if (history) {
      const now = Date.now()
      // Typing bursts in one section collapse into a single undo step
      const coalesce = !!key && lastEdit.current.key === key && now - lastEdit.current.t < 1000
      if (!coalesce) {
        past.current.push(sectionsRef.current)
        if (past.current.length > 80) past.current.shift()
      }
      lastEdit.current = { key: key || null, t: now }
      future.current = []
      bumpHistory()
    }
    sectionsRef.current = next
    setSections(next)
    if (all) next.forEach(s => dirtyIds.current.add(s.id))
    ids.forEach(id => dirtyIds.current.add(id))
    setDirty(true)
    scheduleSync(immediate ? 0 : 600)
  }, [scheduleSync])

  const flash = useCallback((text: string, undo = false) => {
    setNotice({ text, undo })
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 6000)
  }, [])

  // ------------------------------------------------------------
  // Undo / redo
  // ------------------------------------------------------------
  const restore = useCallback((target: Sec[]) => {
    // Sections that exist now but not in the snapshot (e.g. undoing an "add")
    // are soft-deleted, so redo can bring them back with the same id.
    const ids = new Set(target.map(s => s.id))
    const orphans = sectionsRef.current.filter(s => !ids.has(s.id)).map(s => ({ ...s, isDeleted: true }))
    const next = [...target, ...orphans]
    sectionsRef.current = next
    setSections(next)
    next.forEach(s => dirtyIds.current.add(s.id))
    lastEdit.current = { key: null, t: 0 }
    setDirty(true)
    scheduleSync(150)
    if (selectedId && !next.find(s => s.id === selectedId && !s.isDeleted)) setSelectedId(null)
    bumpHistory()
  }, [scheduleSync, selectedId])

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(sectionsRef.current)
    restore(prev)
  }, [restore])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(sectionsRef.current)
    restore(next)
  }, [restore])

  // ------------------------------------------------------------
  // Section operations
  // ------------------------------------------------------------
  const fullIndexFor = (visibleIndex: number) => {
    const list = sectionsRef.current
    const vis = list.filter(s => !s.isDeleted)
    if (visibleIndex >= vis.length) return list.length
    return list.indexOf(vis[Math.max(0, visibleIndex)])
  }

  const createSection = async (type: string, config: any, isVisible = true): Promise<Sec> => {
    const r = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageType, pageId, sectionType: type, config, isVisible, sortOrder: 9999 })
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      throw new Error(d.error || 'Could not add section')
    }
    const d = await r.json()
    return normalize({ ...d.section, config })
  }

  const defaultInsertIndex = () => {
    if (insertIndex !== null) return Math.min(insertIndex, visible.length)
    const at = visible.findIndex(s => s.id === selectedId)
    return at >= 0 ? at + 1 : visible.length
  }

  const scrollPreviewTo = (id: string) => postToPreview({ type: 'scroll', id })

  const addSection = async (type: string, atVisibleIndex = defaultInsertIndex()) => {
    setAddingType(type)
    try {
      const created = await createSection(type, defaultConfig(type))
      const next = [...sectionsRef.current]
      next.splice(fullIndexFor(atVisibleIndex), 0, created)
      commit(next, { immediate: true })
      setSelectedId(created.id)
      setRightTab('content')
      setLeftTab('sections')
      setInsertIndex(null)
      setTimeout(() => scrollPreviewTo(created.id), 900)
    } catch (e: any) {
      toast.error('Failed to add section', e.message)
    } finally {
      setAddingType(null)
    }
  }

  const applyTemplate = async (template: any) => {
    setShowTemplates(false)
    const created: Sec[] = []
    try {
      for (const type of template.sections) created.push(await createSection(type, defaultConfig(type)))
    } catch (e: any) {
      toast.error('Template partly applied', e.message)
    }
    if (created.length) {
      const next = [...sectionsRef.current]
      next.splice(fullIndexFor(defaultInsertIndex()), 0, ...created)
      commit(next, { immediate: true })
      setSelectedId(created[0].id)
      flash(`${template.name}: ${created.length} sections added`, true)
    }
  }

  const updateConfig = (id: string, config: any) => {
    commit(
      sectionsRef.current.map(s => s.id === id ? { ...s, config } : s),
      { key: `cfg:${id}`, dirty: [id] }
    )
  }

  const toggleVisible = (id: string) => {
    commit(sectionsRef.current.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s), { immediate: true })
  }

  const duplicateSection = async (id: string) => {
    const src = sectionsRef.current.find(s => s.id === id)
    if (!src) return
    try {
      const copy = await createSection(src.sectionType, JSON.parse(JSON.stringify(src.config)), src.isVisible)
      const next = [...sectionsRef.current]
      next.splice(next.findIndex(s => s.id === id) + 1, 0, copy)
      commit(next, { immediate: true })
      setSelectedId(copy.id)
      setTimeout(() => scrollPreviewTo(copy.id), 900)
    } catch (e: any) {
      toast.error('Could not duplicate', e.message)
    }
  }

  const moveSection = (id: string, dir: -1 | 1) => {
    const vis = sectionsRef.current.filter(s => !s.isDeleted)
    const from = vis.findIndex(s => s.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= vis.length) return
    reorderVisible(from, to)
    setTimeout(() => scrollPreviewTo(id), 700)
  }

  const reorderVisible = (from: number, to: number) => {
    const list = sectionsRef.current
    const vis = list.filter(s => !s.isDeleted)
    const moved = arrayMove(vis, from, to)
    // keep soft-deleted rows at the end; they are order-agnostic
    commit([...moved, ...list.filter(s => s.isDeleted)], { immediate: true })
  }

  const removeSection = (id: string) => {
    const label = metaFor(sectionsRef.current.find(s => s.id === id)?.sectionType || '')?.label || 'Section'
    commit(sectionsRef.current.map(s => s.id === id ? { ...s, isDeleted: true } : s), { immediate: true })
    if (selectedId === id) setSelectedId(null)
    flash(`${label} removed`, true)
  }

  const selectSection = (id: string | null, opts: { scroll?: boolean } = {}) => {
    setSelectedId(id)
    if (id) {
      setShowRight(true)
      if (opts.scroll) scrollPreviewTo(id)
    }
  }

  // ------------------------------------------------------------
  // Publish / discard
  // ------------------------------------------------------------
  const resetHistory = () => {
    past.current = []
    future.current = []
    lastEdit.current = { key: null, t: 0 }
    bumpHistory()
  }

  const publishChanges = async () => {
    setPublishing(true)
    try {
      const saved = await syncNow()
      if (!saved) throw new Error('Your latest edits could not be saved. Check your connection and try again.')
      const r = await fetch('/api/admin/sections/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageId, action: 'publish' })
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Publish failed')
      const cleaned = sectionsRef.current.filter(s => !s.isDeleted)
      sectionsRef.current = cleaned
      setSections(cleaned)
      resetHistory()
      setDirty(false)
      setSaveState('saved')
      refreshPreview()
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
      clearTimeout(syncTimer.current)
      clearTimeout(retryTimer.current)
      await syncing.current // let any in-flight save land first, then overwrite it
      needsSync.current = false
      dirtyIds.current = new Set()
      const r = await fetch('/api/admin/sections/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageId, action: 'discard' })
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Discard failed')
      const params = new URLSearchParams({ pageType })
      if (pageId) params.set('pageId', pageId)
      const sr = await fetch(`/api/admin/sections?${params}`)
      const sd = await sr.json()
      const fresh = (sd.sections || []).map(normalize)
      sectionsRef.current = fresh
      setSections(fresh)
      setSelectedId(null)
      resetHistory()
      setDirty(false)
      setSaveState('idle')
      refreshPreview()
      toast.success('Changes discarded')
    } catch (e: any) {
      toast.error('Discard failed', e.message)
    } finally {
      setPublishing(false)
    }
  }

  const leaveTo = async (href: string) => {
    await syncNow()
    router.push(href)
  }

  // ------------------------------------------------------------
  // Effects: keyboard, preview messages, unload guard, flush on unmount
  // ------------------------------------------------------------
  const handlers = useRef<any>({})
  useEffect(() => { handlers.current = { undo, redo, syncNow, duplicateSection, removeSection, selectedId } })

  useEffect(() => {
    setHost(window.location.host)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const runShortcut = (key: string, shift: boolean, typing: boolean, e?: Event) => {
      const h = handlers.current
      const k = key.toLowerCase()
      if (k === 'z' && !typing) { e?.preventDefault(); shift ? h.redo() : h.undo() }
      else if (k === 'y' && !typing) { e?.preventDefault(); h.redo() }
      else if (k === 's') { e?.preventDefault(); h.syncNow() }
      else if (k === 'd' && !typing && h.selectedId) { e?.preventDefault(); h.duplicateSection(h.selectedId) }
    }

    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target)
      if (e.ctrlKey || e.metaKey) { runShortcut(e.key, e.shiftKey, typing, e); return }
      if (typing) return
      if (e.key === 'Escape') setSelectedId(null)
      if ((e.key === 'Delete' || e.key === 'Backspace') && handlers.current.selectedId) {
        e.preventDefault()
        handlers.current.removeSection(handlers.current.selectedId)
      }
    }

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== 'sf-preview') return
      const m = e.data
      if (m.type === 'ready') {
        previewReady.current = true
        setPreviewLoading(false)
        postToPreview({ type: 'select', id: handlers.current.selectedId })
      } else if (m.type === 'select') {
        setSelectedId(m.id || null)
        if (m.id) { setShowRight(true) }
      } else if (m.type === 'shortcut') {
        runShortcut(m.key, !!m.shift, false)
      } else if (m.type === 'key') {
        if (m.key === 'Escape') setSelectedId(null)
      }
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (needsSync.current || syncing.current || dirtyIds.current.size) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const onHide = () => { if (document.visibilityState === 'hidden' && needsSync.current) handlers.current.syncNow() }

    window.addEventListener('keydown', onKey)
    window.addEventListener('message', onMessage)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('message', onMessage)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onHide)
      document.body.style.overflow = prev
      // Leaving the editor (e.g. via the sidebar): push whatever is pending
      if (needsSync.current) handlers.current.syncNow()
      clearTimeout(refreshTimer.current)
      clearTimeout(noticeTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep the iframe's selection outline in sync
  useEffect(() => { if (previewReady.current) postToPreview({ type: 'select', id: selectedId }) }, [selectedId, postToPreview])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = ({ active, over }: any) => {
    if (!over || active.id === over.id) return
    const from = visible.findIndex(s => s.id === active.id)
    const to = visible.findIndex(s => s.id === over.id)
    if (from < 0 || to < 0) return
    reorderVisible(from, to)
  }

  const paletteItems = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase()
    return SECTION_CATALOG.filter(t => !q || t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.group.toLowerCase().includes(q))
  }, [paletteSearch])

  const pageValue = pageType === 'custom' && pageId ? `custom:${pageId}` : 'home'
  const switchPage = (value: string) => {
    if (value === 'home') leaveTo('/admin/builder')
    else leaveTo(`/admin/builder?pageType=custom&pageId=${value.split(':')[1]}`)
  }

  const previewSrc = `${publicPath}${publicPath.includes('?') ? '&' : '?'}preview=1`
  const insertLabel = (() => {
    if (insertIndex !== null) return insertIndex === 0 ? 'at the top' : insertIndex >= visible.length ? 'at the end' : `after “${metaFor(visible[insertIndex - 1]?.sectionType)?.label}”`
    const at = visible.findIndex(s => s.id === selectedId)
    return at >= 0 ? `after “${metaFor(visible[at].sectionType)?.label}”` : 'at the end'
  })()

  const canUndo = histSize.past > 0
  const canRedo = histSize.future > 0

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f1f1f1] admin-shell">
      {/* ===== Top bar ===== */}
      <header className="h-14 shrink-0 bg-[#1a1a1a] text-white flex items-center justify-between gap-3 px-3 md:px-4">
        <div className="flex items-center gap-2 min-w-0">
          <a
            href="/admin/themes"
            onClick={(e) => { e.preventDefault(); leaveTo('/admin/themes') }}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white"
            title="Close editor"
          >
            <X className="h-4 w-4" />
          </a>
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
                aria-label={`${d.label} preview`}
                className={cn('p-1.5 rounded-md transition-colors', device === d.id ? 'bg-white text-[#1a1a1a]' : 'text-white/70 hover:text-white')}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <span className="hidden sm:block h-6 w-px bg-white/15 mx-0.5" />
          <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30" title="Undo (⌘Z)" aria-label="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30" title="Redo (⇧⌘Z)" aria-label="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <span className="hidden lg:block h-6 w-px bg-white/15 mx-0.5" />
          <button onClick={() => setShowLeft(v => !v)} className={cn('hidden lg:inline-flex p-1.5 rounded-md hover:bg-white/10', !showLeft && 'text-white/40')} title="Toggle sections panel" aria-label="Toggle sections panel">
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowRight(v => !v)} className={cn('hidden lg:inline-flex p-1.5 rounded-md hover:bg-white/10', !showRight && 'text-white/40')} title="Toggle settings panel" aria-label="Toggle settings panel">
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <SaveBadge state={saveState} dirty={dirty} onRetry={() => syncNow()} />
          <button
            onClick={discardChanges}
            disabled={!dirty || publishing}
            className="hidden md:inline-flex p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30"
            title="Discard unpublished changes"
            aria-label="Discard unpublished changes"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <a
            href={previewSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-white/25 text-[12px] hover:bg-white/10"
            title="Open the draft in a new tab"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </a>
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
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </header>

      <EditorContext.Provider value={editorCtx}>
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* ===== Left panel ===== */}
          {showLeft && (
            <aside data-builder-left className="w-full lg:w-[280px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#e3e3e3] flex flex-col lg:min-h-0">
              <div className="flex items-center gap-1 px-2 pt-2">
                {(['sections', 'add'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={cn('flex-1 h-8 rounded-md text-[12px] font-medium transition-colors capitalize', leftTab === tab ? 'bg-[#1a1a1a] text-white' : 'text-[#303030] hover:bg-[#f1f1f1]')}
                  >
                    {tab === 'add' ? 'Add' : 'Sections'}
                  </button>
                ))}
              </div>

              {leftTab === 'sections' ? (
                <div className="flex-1 lg:min-h-0 flex flex-col">
                  <div className="px-3 py-2.5 border-b border-[#efefef]">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">Page structure</p>
                      <span className="text-[10px] text-[#8a8a8a]">{visible.length}</span>
                    </div>
                    <p className="text-[11px] text-[#8a8a8a] mt-0.5 truncate">{pageLabel}</p>
                  </div>

                  <div data-builder-tree className="flex-1 lg:overflow-y-auto p-2 space-y-0.5">
                    <GlobalRow label="Header" />
                    {visible.length === 0 && (
                      <div className="px-2 py-6 text-center">
                        <Layers className="h-5 w-5 text-[#b5b5b5] mx-auto" />
                        <p className="text-[12px] font-medium text-[#1a1a1a] mt-2">Nothing here yet</p>
                        <p className="text-[11px] text-[#8a8a8a] mt-0.5 px-2">The preview shows your default layout. Add a section to start customizing.</p>
                        <button onClick={() => { setInsertIndex(0); setLeftTab('add') }} className="text-[11px] text-[#005bd3] hover:underline mt-1.5">Add your first section</button>
                      </div>
                    )}
                    <DndContext id="builder-tree" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                      <SortableContext items={visible.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {visible.map((section, idx) => (
                          <div key={section.id}>
                            <InsertGap onClick={() => { setInsertIndex(idx); setLeftTab('add') }} />
                            <TreeRow
                              section={section}
                              selected={selectedId === section.id}
                              onSelect={() => selectSection(section.id, { scroll: true })}
                              onToggle={() => toggleVisible(section.id)}
                              onDuplicate={() => duplicateSection(section.id)}
                              onRemove={() => removeSection(section.id)}
                            />
                          </div>
                        ))}
                      </SortableContext>
                    </DndContext>
                    {visible.length > 0 && <InsertGap onClick={() => { setInsertIndex(visible.length); setLeftTab('add') }} />}
                    <GlobalRow label="Footer" />
                  </div>

                  <div className="p-2 border-t border-[#efefef] space-y-1.5">
                    <button
                      onClick={() => { setInsertIndex(null); setLeftTab('add') }}
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
                        type="search"
                        name="block-search"
                        autoComplete="off"
                      />
                    </div>
                    <p className="text-[10px] text-[#8a8a8a] mt-1.5 flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3 shrink-0" />
                      <span className="truncate">Click to add {insertLabel}</span>
                      {insertIndex !== null && (
                        <button onClick={() => setInsertIndex(null)} className="ml-auto text-[#005bd3] hover:underline shrink-0">reset</button>
                      )}
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
                                data-block-type={t.type}
                                onClick={() => addSection(t.type)}
                                disabled={!!addingType}
                                className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-[#e9e9e9] bg-white text-left hover:border-[#b5b5b5] hover:shadow-sm transition-all disabled:opacity-50"
                              >
                                <span className="h-8 w-8 rounded-md bg-[#f4f4f4] flex items-center justify-center shrink-0">
                                  <t.icon className="h-4 w-4 text-[#303030]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[12px] font-medium text-[#1a1a1a] truncate">{t.label}</span>
                                  <span className="block text-[10px] text-[#8a8a8a] truncate">{t.description}</span>
                                </span>
                                {addingType === t.type
                                  ? <RefreshCw className="h-3 w-3 animate-spin text-[#8a8a8a]" />
                                  : <Plus className="h-3.5 w-3.5 text-[#8a8a8a] shrink-0" />}
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
          )}

          {/* ===== Canvas (the real storefront) ===== */}
          <main data-builder-canvas-area className="flex-1 min-w-0 min-h-[70vh] lg:min-h-0 flex flex-col bg-[#e9e9e9] relative">
            <div className="flex-1 min-h-0 flex flex-col p-3 md:p-5">
              <div
                className="mx-auto w-full flex-1 min-h-0 flex flex-col transition-[max-width] duration-300"
                style={{ maxWidth: deviceMeta.width === '100%' ? '100%' : deviceMeta.width }}
              >
                <div className="flex items-center gap-2 h-9 px-3 rounded-t-xl bg-[#f7f7f7] border border-[#dcdcdc] border-b-0 shrink-0">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 flex items-center justify-center min-w-0">
                    <span className="inline-flex items-center gap-1.5 max-w-full px-3 h-6 rounded-md bg-white border border-[#e3e3e3] text-[11px] text-[#616161] truncate">
                      <Lock className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{host}{publicPath}</span>
                      <span className="text-[#8a8a8a] shrink-0">· draft</span>
                    </span>
                  </div>
                  <button
                    onClick={() => { previewReady.current = false; setPreviewLoading(true); setPreviewKey(k => k + 1) }}
                    className="p-1 rounded hover:bg-[#e9e9e9]" title="Reload preview" aria-label="Reload preview"
                  >
                    <RefreshCw className="h-3 w-3 text-[#616161]" />
                  </button>
                </div>
                <div className="relative flex-1 min-h-0 bg-white border border-[#dcdcdc] rounded-b-xl overflow-hidden">
                  <iframe
                    key={previewKey}
                    ref={iframeRef}
                    src={previewSrc}
                    title="Storefront preview"
                    className="absolute inset-0 w-full h-full bg-white block"
                    onLoad={() => setPreviewLoading(false)}
                  />
                  {previewLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center pointer-events-none">
                      <Loader2 className="h-5 w-5 animate-spin text-[#8a8a8a]" />
                    </div>
                  )}
                  {visible.length === 0 && !previewLoading && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-[12px] rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
                      Showing your default layout.
                      <button onClick={() => setShowTemplates(true)} className="underline underline-offset-2">Start from a template</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#8a8a8a] text-center mt-2 shrink-0">
                Click a section to edit it · drag rows in the left panel to reorder · ⌘Z undo · changes autosave as drafts until you publish
              </p>
            </div>

            {notice && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-[#1a1a1a] text-white text-[12px] rounded-lg pl-3 pr-2 py-2 shadow-xl flex items-center gap-3">
                <span>{notice.text}</span>
                {notice.undo && (
                  <button onClick={() => { undo(); setNotice(null) }} className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 font-medium">Undo</button>
                )}
                <button onClick={() => setNotice(null)} aria-label="Dismiss" className="p-0.5 text-white/60 hover:text-white"><X className="h-3 w-3" /></button>
              </div>
            )}
          </main>

          {/* ===== Inspector ===== */}
          {showRight && (
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
                      <IconBtn title="Move up" disabled={visible.findIndex(s => s.id === selected.id) === 0} onClick={() => moveSection(selected.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Move down" disabled={visible.findIndex(s => s.id === selected.id) === visible.length - 1} onClick={() => moveSection(selected.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Duplicate (⌘D)" onClick={() => duplicateSection(selected.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title={selected.isVisible ? 'Hide' : 'Show'} onClick={() => toggleVisible(selected.id)}>{selected.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
                      <IconBtn title="Remove (Del)" danger onClick={() => removeSection(selected.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
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
                        key={selected.id}
                        section={selected}
                        device={device === 'mobile' ? 'mobile' : 'desktop'}
                        setDevice={(d) => setDevice(d)}
                        onUpdate={(config) => updateConfig(selected.id, config)}
                      />
                    ) : (
                      <DesignEditor
                        key={selected.id}
                        config={selected.config}
                        sectionType={selected.sectionType}
                        onUpdate={(design) => updateConfig(selected.id, { ...selected.config, design })}
                      />
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-[#e3e3e3]">
                    <p className="text-[11px] text-[#8a8a8a]">
                      {saveState === 'saving' || saveState === 'pending' ? 'Saving draft…' : saveState === 'error' ? 'Could not save — retrying' : 'Draft saved automatically'}
                      {dirty ? ' · not published' : ''}
                    </p>
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
                    <div className="rounded-lg border border-[#e3e3e3] p-3 space-y-1.5">
                      <p className="text-[12px] font-medium text-[#1a1a1a]">{visible.length} section{visible.length === 1 ? '' : 's'}</p>
                      {visible.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => selectSection(s.id, { scroll: true })}
                          className="w-full flex items-center justify-between gap-2 text-left text-[11px] text-[#616161] hover:text-[#1a1a1a]"
                        >
                          <span className={cn('truncate', !s.isVisible && 'line-through opacity-60')}>{i + 1}. {metaFor(s.sectionType)?.label || s.sectionType}</span>
                          <ChevronDown className="h-3 w-3 -rotate-90 shrink-0" />
                        </button>
                      ))}
                      {visible.length === 0 && <p className="text-[11px] text-[#8a8a8a]">No sections yet.</p>}
                    </div>
                    <div className="rounded-lg bg-[#f7f7f7] p-3">
                      <p className="text-[11px] font-medium text-[#303030] flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> Shortcuts</p>
                      <ul className="text-[11px] text-[#616161] mt-1.5 space-y-1 list-disc pl-4">
                        <li>Click any section in the preview to edit it.</li>
                        <li><kbd className="font-mono">⌘Z</kbd> / <kbd className="font-mono">⇧⌘Z</kbd> undo & redo — works for add, remove and reorder too.</li>
                        <li><kbd className="font-mono">⌘D</kbd> duplicate · <kbd className="font-mono">Del</kbd> remove · <kbd className="font-mono">Esc</kbd> deselect.</li>
                        <li>Hover between rows in the left panel to insert exactly where you want.</li>
                        <li>Nothing goes live until you press Publish.</li>
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
          )}
        </div>
      </EditorContext.Provider>

      {/* Templates dialog */}
      {showTemplates && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e3e3e3]">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Starter templates</h2>
                <p className="text-[11px] text-[#8a8a8a]">Sections are added {insertLabel}. You can undo it.</p>
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

function SaveBadge({ state, dirty, onRetry }: { state: SaveState; dirty: boolean; onRetry: () => void }) {
  if (state === 'error') {
    return (
      <button onClick={onRetry} className="hidden md:flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 mr-1" title="Saving failed — click to retry now">
        <AlertTriangle className="h-3 w-3" /> Not saved · retry
      </button>
    )
  }
  return (
    <span className="hidden md:flex items-center gap-1 text-[11px] text-white/60 mr-1">
      {state === 'saving' || state === 'pending'
        ? <><Save className="h-3 w-3 animate-pulse" /> Saving…</>
        : <><Check className="h-3 w-3 text-emerald-400" /> {dirty ? 'Draft saved' : 'Published'}</>}
    </span>
  )
}

function GlobalRow({ label }: { label: string }) {
  return (
    <Link
      href="/admin/appearance"
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#8a8a8a] hover:bg-[#f7f7f7]"
      title={`${label} is global — edit it under Store settings`}
    >
      <Lock className="h-3 w-3 shrink-0" />
      <span className="text-[12px] flex-1">{label}</span>
      <span className="text-[9px] uppercase tracking-wide">Global</span>
    </Link>
  )
}

function InsertGap({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group/gap relative block w-full h-1.5 -my-0.5 z-[1]"
      title="Insert a section here"
      aria-label="Insert a section here"
    >
      <span className="absolute inset-x-2 top-1/2 h-px bg-transparent group-hover/gap:bg-[#005bd3] transition-colors" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[#005bd3] text-white items-center justify-center hidden group-hover/gap:flex">
        <Plus className="h-2.5 w-2.5" />
      </span>
    </button>
  )
}

function TreeRow({ section, selected, onSelect, onToggle, onDuplicate, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const meta = metaFor(section.sectionType)
  const Icon = meta?.icon || Layers
  const sub = subtitleFor(section)
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : undefined, position: 'relative', zIndex: isDragging ? 10 : undefined }}
      data-section-id={section.id}
      data-section-type={section.sectionType}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-1.5 pl-1 pr-1.5 py-1.5 rounded-md cursor-pointer border bg-white',
        selected ? 'bg-[#f0f6ff] border-[#b5d1ff]' : 'border-transparent hover:bg-[#f7f7f7]',
        !section.isVisible && 'opacity-55'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-0.5 text-[#b5b5b5] hover:text-[#616161] cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
        aria-label={`Reorder ${meta?.label || section.sectionType}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-3.5 w-3.5 text-[#616161] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-[#1a1a1a] truncate leading-tight">{meta?.label || section.sectionType}</p>
        {sub && <p className="text-[10px] text-[#8a8a8a] truncate leading-tight mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
        <RowBtn title={section.isVisible ? 'Hide section' : 'Show section'} onClick={onToggle}>{section.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</RowBtn>
        <RowBtn title="Duplicate" onClick={onDuplicate}><Copy className="h-3 w-3" /></RowBtn>
        <RowBtn title="Remove" onClick={onRemove} danger><Trash2 className="h-3 w-3" /></RowBtn>
      </div>
      {!section.isVisible && <EyeOff className="h-3 w-3 text-[#8a8a8a] shrink-0 group-hover:hidden" />}
    </div>
  )
}

function RowBtn({ title, onClick, danger, children }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn('p-1 rounded text-[#8a8a8a] hover:bg-[#ececec] hover:text-[#1a1a1a]', danger && 'hover:bg-rose-50 hover:text-rose-600')}
    >
      {children}
    </button>
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
