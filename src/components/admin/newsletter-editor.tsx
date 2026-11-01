'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { FileUpload } from '@/components/shared/file-upload'
import { RichTextEditor } from './newsletter-rich-text'
import { renderNewsletterEmail, defaultBlock } from '@/lib/newsletter'
import {
  ArrowLeft, Save, Send, Loader2, Monitor, Smartphone, Eye, RefreshCw,
  Heading2, Type as TypeIcon, Image as ImageIcon, MousePointerClick, Minus, MoveVertical,
  GripVertical, Trash2, Copy, Settings, FlaskConical, TriangleAlert, CheckCircle2
} from 'lucide-react'

const BLOCK_META = {
  heading: { label: 'Heading', icon: Heading2 },
  text: { label: 'Text', icon: TypeIcon },
  image: { label: 'Image', icon: ImageIcon },
  button: { label: 'Button', icon: MousePointerClick },
  divider: { label: 'Divider', icon: Minus },
  spacer: { label: 'Spacer', icon: MoveVertical }
}

export function NewsletterEditor({ campaign: initial, subscriberCount, store, onBack, onSaved }) {
  const [campaign, setCampaign] = useState(() => normalize(initial))
  const [selected, setSelected] = useState(-1) // -1 = campaign settings
  const [rightTab, setRightTab] = useState('campaign')
  const [device, setDevice] = useState('desktop')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [previewNonce, setPreviewNonce] = useState(0)
  const [testDialog, setTestDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [sendDialog, setSendDialog] = useState(null) // { phase, sent, failed, remaining, total, error }
  const abortRef = useRef(false)

  const set = (patch) => { setCampaign(c => ({ ...c, ...patch })); setDirty(true) }
  const setBlock = (i, patch) => {
    setCampaign(c => {
      const blocks = [...c.blocks]
      blocks[i] = { ...blocks[i], ...patch }
      return { ...c, blocks }
    })
    setDirty(true)
  }

  // Live email preview — debounced so typing stays smooth
  const [previewHtml, setPreviewHtml] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewHtml(renderNewsletterEmail(
        { ...campaign, blocks: campaign.blocks },
        { storeName: store.name, logoUrl: store.logoUrl, storeUrl: store.url, unsubscribeUrl: '#', addressText: store.address }
      ))
    }, 250)
    return () => clearTimeout(t)
  }, [campaign, store])

  const saveDraft = useCallback(async (silent = false) => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campaign, id: campaign.id || undefined })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      if (!campaign.id) setCampaign(c => ({ ...c, id: d.campaign.id }))
      setDirty(false)
      onSaved?.()
      if (!silent) toast.success('Draft saved')
      return d.campaign.id
    } catch (e) {
      if (!silent) toast.error('Save failed', e.message)
      return null
    } finally {
      setSaving(false)
    }
  }, [campaign, onSaved])

  const sendTest = async () => {
    setTesting(true)
    try {
      const id = await saveDraft(true)
      if (!id) return
      const r = await fetch(`/api/admin/newsletter/campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.success('Test sent', `Check ${testEmail}`)
      setTestDialog(false)
    } catch (e) {
      toast.error('Test failed', e.message)
    } finally {
      setTesting(false)
    }
  }

  const validate = () => {
    if (!campaign.subject.trim()) return 'Write a subject line first'
    if (campaign.mode === 'blocks' && campaign.blocks.length === 0) return 'Add at least one content block'
    if (campaign.mode === 'image' && !campaign.imageUrl) return 'Upload the newsletter image first'
    return null
  }

  // Full send flow: save → start → loop batches until done
  const startSend = async () => {
    const err = validate()
    if (err) { toast.error(err); return }
    if (!confirm(`Send "${campaign.subject}" to ${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}?`)) return
    abortRef.current = false
    setSendDialog({ phase: 'starting', sent: 0, failed: 0, remaining: 0, total: subscriberCount })
    try {
      const id = await saveDraft(true)
      if (!id) throw new Error('Could not save the campaign')
      const sr = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, { method: 'POST' })
      const sd = await sr.json()
      if (!sr.ok) throw new Error(sd.error || 'Could not start the send')
      setSendDialog({ phase: 'sending', sent: sd.total - sd.remaining, failed: 0, remaining: sd.remaining, total: sd.total })
      await runBatches(id, sd.total)
    } catch (e) {
      setSendDialog(d => d && { ...d, phase: 'error', error: e.message })
    }
  }

  const resumeSend = async (id) => {
    abortRef.current = false
    setSendDialog({ phase: 'starting', sent: 0, failed: 0, remaining: 0, total: 0 })
    try {
      const sr = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, { method: 'POST' })
      const sd = await sr.json()
      if (!sr.ok) throw new Error(sd.error || 'Could not resume')
      setSendDialog({ phase: 'sending', sent: sd.total - sd.remaining, failed: 0, remaining: sd.remaining, total: sd.total })
      await runBatches(id, sd.total)
    } catch (e) {
      setSendDialog(d => d && { ...d, phase: 'error', error: e.message })
    }
  }

  const runBatches = async (id, total) => {
    let guard = 0
    while (guard++ < 10000) {
      if (abortRef.current) { setSendDialog(d => d && { ...d, phase: 'paused' }); return }
      const br = await fetch(`/api/admin/newsletter/campaigns/${id}/batch`, { method: 'POST' })
      const bd = await br.json()
      if (!br.ok) throw new Error(bd.error || 'Batch failed')
      setSendDialog({
        phase: 'sending', sent: bd.sentCount, failed: bd.failedCount,
        remaining: bd.remaining, total: bd.total || total
      })
      if (bd.done) {
        // Surface which recipients failed and why, so problems are actionable
        let failures = []
        if (bd.failedCount > 0) {
          try {
            const dr = await fetch(`/api/admin/newsletter/campaigns/${id}`)
            const dd = await dr.json()
            failures = (dd.recipientsSample || []).filter(r => r.status === 'failed')
              .slice(0, 5).map(r => ({ email: r.email, error: r.error }))
          } catch {}
        }
        setSendDialog(d => d && { ...d, phase: 'done', failures })
        if (bd.failedCount > 0) {
          toast.error('Finished with failures', `${bd.sentCount} delivered, ${bd.failedCount} failed — details in the dialog`)
        } else {
          toast.success('Newsletter sent', `${bd.sentCount} delivered`)
        }
        onSaved?.()
        return
      }
    }
  }

  // ===== Block list operations =====
  const addBlock = (type) => {
    setCampaign(c => ({ ...c, blocks: [...c.blocks, defaultBlock(type)] }))
    setDirty(true)
    setSelected(campaign.blocks.length)
    setRightTab('block')
  }
  const removeBlock = (i) => {
    setCampaign(c => ({ ...c, blocks: c.blocks.filter((_, x) => x !== i) }))
    setDirty(true)
    setSelected(-1); setRightTab('campaign')
  }
  const duplicateBlock = (i) => {
    setCampaign(c => {
      const blocks = [...c.blocks]
      blocks.splice(i + 1, 0, JSON.parse(JSON.stringify(blocks[i])))
      return { ...c, blocks }
    })
    setDirty(true)
  }
  const moveBlock = (from, to) => {
    if (from === to || from == null || to == null) return
    setCampaign(c => {
      const blocks = [...c.blocks]
      const [m] = blocks.splice(from, 1)
      blocks.splice(to, 0, m)
      return { ...c, blocks }
    })
    setDirty(true)
    setSelected(to)
  }

  const iframeWidth = device === 'mobile' ? 375 : 640

  return (
    <div className="space-y-4">
      {/* ===== Top bar ===== */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => { if (!dirty || confirm('Discard unsaved changes?')) onBack() }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-[240px]">
          <Input
            value={campaign.subject}
            onChange={(e) => set({ subject: e.target.value })}
            placeholder="Subject line — what is this email about?"
            className="text-base font-semibold h-10"
          />
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button onClick={() => set({ mode: 'blocks' })} className={`px-3 py-2 text-xs font-medium ${campaign.mode === 'blocks' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>Blocks</button>
          <button onClick={() => set({ mode: 'image' })} className={`px-3 py-2 text-xs font-medium ${campaign.mode === 'image' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>Full image</button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTestDialog(true)}><FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Test</Button>
        <Button variant="outline" size="sm" onClick={() => saveDraft()} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          {dirty ? 'Save' : 'Saved'}
        </Button>
        <Button size="sm" onClick={startSend} disabled={saving}>
          <Send className="h-3.5 w-3.5 mr-1.5" /> Send to {subscriberCount}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_320px] gap-4 items-start">
        {/* ===== Left: block stack ===== */}
        {campaign.mode === 'blocks' ? (
          <div className="space-y-3 xl:sticky xl:top-24">
            <div className="rounded-xl border border-border bg-background p-2 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1.5 py-1">Content blocks</p>
              {campaign.blocks.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">Add blocks below — heading, text, image, button…</p>
              )}
              {campaign.blocks.map((b, i) => {
                const meta = BLOCK_META[b.type] || { label: b.type, icon: TypeIcon }
                const Icon = meta.icon
                const summary = b.type === 'heading' ? b.text : b.type === 'button' ? b.text
                  : b.type === 'image' ? (b.url ? 'image uploaded' : 'no image yet')
                  : b.type === 'text' ? stripTags(b.html).slice(0, 40)
                  : b.type === 'divider' ? '— divider —' : `${b.height || 24}px space`
                return (
                  <div key={i}>
                    <div
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i) }}
                      onDrop={() => { moveBlock(dragIdx, i); setDragIdx(null); setDragOverIdx(null) }}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                      onClick={() => { setSelected(i); setRightTab('block') }}
                      className={`group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer border transition-colors ${selected === i ? 'border-foreground bg-muted/60' : 'border-transparent hover:bg-muted/40'} ${dragOverIdx === i ? 'border-t-2 border-t-foreground' : ''}`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 cursor-grab" />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{meta.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{summary || '\u00A0'}</p>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); duplicateBlock(i) }} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Duplicate"><Copy className="h-3 w-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeBlock(i) }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" title="Remove"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    {dragOverIdx === i && dragIdx !== null && dragIdx !== i && <div className="h-0.5 bg-foreground rounded-full" />}
                  </div>
                )
              })}
            </div>
            <div className="rounded-xl border border-dashed border-border bg-background p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-1.5">Add a block</p>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(BLOCK_META).map(([type, meta]) => (
                  <button key={type} onClick={() => addBlock(type)} className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={`Add ${meta.label}`}>
                    <meta.icon className="h-4 w-4" />
                    <span className="text-[9px] font-medium">{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 xl:sticky xl:top-24">
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div>
                <Label className="text-xs">Full-width image</Label>
                <div className="mt-1.5"><FileUpload type="image" value={campaign.imageUrl || ''} onChange={(url) => set({ imageUrl: url })} /></div>
              </div>
              <div>
                <Label className="text-xs">When clicked, go to</Label>
                <Input className="mt-1.5" value={campaign.clickUrl || ''} onChange={(e) => set({ clickUrl: e.target.value })} placeholder="/products or https://…" />
                <p className="text-[10px] text-muted-foreground mt-1">The whole image becomes one big clickable link to your store.</p>
              </div>
              <div>
                <Label className="text-xs">Alt text (accessibility)</Label>
                <Input className="mt-1.5" value={campaign.imageAlt || ''} onChange={(e) => set({ imageAlt: e.target.value })} placeholder="Spring collection banner" />
              </div>
            </div>
          </div>
        )}

        {/* ===== Center: live preview ===== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" /> Live preview</Badge>
              {dirty && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">Unsaved</Badge>}
            </div>
            <div className="flex items-center gap-1">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button onClick={() => setDevice('desktop')} className={`px-2.5 py-1.5 text-xs ${device === 'desktop' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}><Monitor className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDevice('mobile')} className={`px-2.5 py-1.5 text-xs ${device === 'mobile' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}><Smartphone className="h-3.5 w-3.5" /></button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewNonce(n => n + 1)} title="Refresh preview"><RefreshCw className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-zinc-100 p-4 overflow-auto" style={{ maxHeight: '72vh' }}>
            <iframe
              key={previewNonce}
              title="Email preview"
              srcDoc={previewHtml}
              className="mx-auto block bg-white rounded-lg shadow-md border border-border transition-all"
              style={{ width: iframeWidth, maxWidth: '100%', height: device === 'mobile' ? 560 : 640 }}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>

        {/* ===== Right: settings panel ===== */}
        <div className="xl:sticky xl:top-24">
          <div className="rounded-xl border border-border bg-background">
            <div className="flex border-b border-border">
              <button onClick={() => setRightTab('campaign')} className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 ${rightTab === 'campaign' ? 'border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Settings className="h-3.5 w-3.5" /> Campaign</button>
              <button onClick={() => { if (selected >= 0 || rightTab === 'block') setRightTab('block') }} disabled={selected < 0} className={`flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 ${rightTab === 'block' ? 'border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <TypeIcon className="h-3.5 w-3.5" /> Block
              </button>
            </div>
            <div className="p-4 max-h-[64vh] overflow-y-auto space-y-3.5">
              {rightTab === 'campaign' ? (
                <>
                  <div>
                    <Label className="text-xs">Subject</Label>
                    <Input className="mt-1.5" value={campaign.subject} onChange={(e) => set({ subject: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Preheader (inbox preview text)</Label>
                    <Input className="mt-1.5" value={campaign.preheader || ''} onChange={(e) => set({ preheader: e.target.value })} placeholder="A short teaser shown after the subject" />
                  </div>
                  <div>
                    <Label className="text-xs">Accent color (buttons & header line)</Label>
                    <div className="flex gap-2 mt-1.5">
                      <input type="color" value={campaign.accentColor} onChange={(e) => set({ accentColor: e.target.value })} className="h-9 w-12 rounded border border-input cursor-pointer" />
                      <Input value={campaign.accentColor} onChange={(e) => set({ accentColor: e.target.value })} className="font-mono text-xs" />
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">What subscribers see</p>
                    <p>Header with your store name & logo, the content above, and an unsubscribe link in the footer. Every email is personalized with its own unsubscribe link.</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Recipients</span>
                    <Badge variant="secondary">{subscriberCount} active</Badge>
                  </div>
                </>
              ) : (
                <BlockEditor block={campaign.blocks[selected]} onChange={(patch) => setBlock(selected, patch)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Test dialog ===== */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Send a test email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Send to</Label>
              <Input className="mt-1.5" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <p className="text-xs text-muted-foreground">Sends exactly what subscribers will get (with [TEST] in the subject).</p>
            <Button onClick={sendTest} disabled={testing || !testEmail} className="w-full">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Send test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Send progress dialog ===== */}
      <Dialog open={!!sendDialog} onOpenChange={(open) => { if (!open && sendDialog?.phase === 'sending') { abortRef.current = true } setSendDialog(null) }}>
        <DialogContent className="max-w-md">
          {sendDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {sendDialog.phase === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                    sendDialog.phase === 'error' || sendDialog.phase === 'paused' ? <TriangleAlert className="h-5 w-5 text-amber-600" /> :
                      <Loader2 className="h-5 w-5 animate-spin" />}
                  {sendDialog.phase === 'starting' && 'Preparing send…'}
                  {sendDialog.phase === 'sending' && 'Sending newsletter…'}
                  {sendDialog.phase === 'done' && 'Campaign sent'}
                  {sendDialog.phase === 'paused' && 'Send paused'}
                  {sendDialog.phase === 'error' && 'Send stopped'}
                </DialogTitle>
              </DialogHeader>
              {(sendDialog.phase === 'sending' || sendDialog.phase === 'starting' || sendDialog.phase === 'paused') && (
                <div className="space-y-3">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-foreground transition-all" style={{ width: sendDialog.total ? `${Math.round(((sendDialog.sent + sendDialog.failed) / sendDialog.total) * 100)}%` : '4%' }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{sendDialog.sent + sendDialog.failed} / {sendDialog.total} processed</span>
                    <span>{sendDialog.failed > 0 ? `${sendDialog.failed} failed` : 'no failures'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Keep this window open while sending. If it closes, the campaign can be resumed from the list — nothing is lost.</p>
                  {sendDialog.phase === 'paused' && (
                    <Button size="sm" onClick={() => campaign.id && resumeSend(campaign.id)}>Continue sending</Button>
                  )}
                </div>
              )}
              {sendDialog.phase === 'done' && (
                <div className="space-y-3 text-sm">
                  <p>{sendDialog.sent} emails delivered{sendDialog.failed ? `, ${sendDialog.failed} failed` : ''}.</p>
                  {sendDialog.failures?.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-amber-800">Failed recipients:</p>
                      {sendDialog.failures.map(f => (
                        <div key={f.email} className="text-xs text-amber-800">
                          <span className="font-mono">{f.email}</span> — {f.error || 'unknown error'}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" onClick={() => setSendDialog(null)}>Done</Button>
                </div>
              )}
              {sendDialog.phase === 'error' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{sendDialog.error}</p>
                  <p className="text-xs text-muted-foreground">Already-processed recipients are kept. Press continue to pick up where it stopped.</p>
                  <Button size="sm" onClick={() => campaign.id && resumeSend(campaign.id)}>Continue sending</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalize(c) {
  let blocks = c.blocks
  if (typeof blocks === 'string') { try { blocks = JSON.parse(blocks) } catch { blocks = [] } }
  return {
    id: c.id || null,
    subject: c.subject || '',
    preheader: c.preheader || '',
    mode: c.mode === 'image' ? 'image' : 'blocks',
    blocks: Array.isArray(blocks) ? blocks : [],
    imageUrl: c.imageUrl || '',
    clickUrl: c.clickUrl || '',
    imageAlt: c.imageAlt || '',
    accentColor: c.accentColor || '#1a1a1a'
  }
}

// ===== Per-block settings =====
function BlockEditor({ block, onChange }) {
  if (!block) return <p className="text-xs text-muted-foreground">Select a block on the left, or add one.</p>
  const set = (k) => (e) => onChange({ [k]: e?.target ? e.target.value : e })

  if (block.type === 'heading') {
    return (
      <>
        <div><Label className="text-xs">Heading text</Label><Input className="mt-1.5" value={block.text || ''} onChange={set('text')} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Size</Label>
            <select value={block.size || 'large'} onChange={set('size')} className="mt-1.5 h-9 w-full px-2 rounded-md border border-input bg-background text-sm">
              <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="xlarge">Extra large</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Align</Label>
            <select value={block.align || 'left'} onChange={set('align')} className="mt-1.5 h-9 w-full px-2 rounded-md border border-input bg-background text-sm">
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <div className="flex gap-2 mt-1.5">
            <input type="color" value={block.color || '#111111'} onChange={set('color')} className="h-9 w-12 rounded border border-input cursor-pointer" />
            <Input value={block.color || '#111111'} onChange={set('color')} className="font-mono text-xs" />
          </div>
        </div>
      </>
    )
  }

  if (block.type === 'text') {
    return (
      <>
        <div>
          <Label className="text-xs">Text</Label>
          <div className="mt-1.5"><RichTextEditor value={block.html || ''} onChange={(html) => onChange({ html })} minHeight={160} /></div>
        </div>
        <div>
          <Label className="text-xs">Align</Label>
          <select value={block.align || 'left'} onChange={set('align')} className="mt-1.5 h-9 w-full px-2 rounded-md border border-input bg-background text-sm">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </div>
        <p className="text-[10px] text-muted-foreground">Bold, italic, links and lists are supported. Colors follow a readable default that works in every inbox.</p>
      </>
    )
  }

  if (block.type === 'image') {
    return (
      <>
        <div><Label className="text-xs">Image</Label><div className="mt-1.5"><FileUpload type="image" value={block.url || ''} onChange={(url) => onChange({ url })} /></div></div>
        <div><Label className="text-xs">Alt text</Label><Input className="mt-1.5" value={block.alt || ''} onChange={set('alt')} /></div>
        <div><Label className="text-xs">Link (optional)</Label><Input className="mt-1.5" value={block.link || ''} onChange={set('link')} placeholder="/products" /></div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Rounded corners</Label>
          <Switch checked={!!block.rounded} onCheckedChange={(v) => onChange({ rounded: v })} />
        </div>
        <div>
          <Label className="text-xs">Width: {block.width || 100}%</Label>
          <input type="range" min={25} max={100} step={5} value={block.width || 100} onChange={set('width')} className="w-full mt-1" />
        </div>
      </>
    )
  }

  if (block.type === 'button') {
    return (
      <>
        <div><Label className="text-xs">Button text</Label><Input className="mt-1.5" value={block.text || ''} onChange={set('text')} /></div>
        <div><Label className="text-xs">Link</Label><Input className="mt-1.5" value={block.url || ''} onChange={set('url')} placeholder="/products" /></div>
        <div>
          <Label className="text-xs">Align</Label>
          <select value={block.align || 'left'} onChange={set('align')} className="mt-1.5 h-9 w-full px-2 rounded-md border border-input bg-background text-sm">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Background</Label>
            <input type="color" value={block.color || ''} onChange={set('color')} className="mt-1.5 h-9 w-full rounded border border-input cursor-pointer" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Empty = campaign accent</p>
          </div>
          <div>
            <Label className="text-xs">Text color</Label>
            <input type="color" value={block.textColor || '#ffffff'} onChange={set('textColor')} className="mt-1.5 h-9 w-full rounded border border-input cursor-pointer" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Pill shape</Label>
          <Switch checked={!!block.pill} onCheckedChange={(v) => onChange({ pill: v })} />
        </div>
      </>
    )
  }

  if (block.type === 'divider') {
    return (
      <>
        <div>
          <Label className="text-xs">Color</Label>
          <div className="flex gap-2 mt-1.5">
            <input type="color" value={block.color || '#e5e5e5'} onChange={set('color')} className="h-9 w-12 rounded border border-input cursor-pointer" />
            <Input value={block.color || '#e5e5e5'} onChange={set('color')} className="font-mono text-xs" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Spacing: {block.padding || 16}px</Label>
          <input type="range" min={0} max={48} step={4} value={block.padding || 16} onChange={set('padding')} className="w-full mt-1" />
        </div>
      </>
    )
  }

  if (block.type === 'spacer') {
    return (
      <>
        <div>
          <Label className="text-xs">Height: {block.height || 24}px</Label>
          <input type="range" min={4} max={120} step={4} value={block.height || 24} onChange={set('height')} className="w-full mt-1" />
        </div>
        <div className="h-6 rounded bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground">empty space</div>
      </>
    )
  }

  return <p className="text-xs text-muted-foreground">No settings for this block.</p>
}
