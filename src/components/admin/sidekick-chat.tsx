'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles, Send, Settings2, Loader2, Copy, Check, Trash2, KeyRound,
  Brain, ChevronDown, Square, ArrowUpRight, Wand2, Mail, TrendingUp, Package
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Role = 'user' | 'assistant'
type Message = { role: Role; content: string; thinking?: string; streaming?: boolean }
type Settings = {
  hasKey: boolean
  maskedKey: string
  baseUrl: string
  model: string
  source: 'stored' | 'env' | 'none'
}

const SUGGESTIONS = [
  {
    icon: Wand2,
    label: 'Write a product description',
    prompt: 'Write a compelling product description for my best-selling product. Include a short intro, three benefit bullets and a one-line call to action. Ask me which product if you need to.'
  },
  {
    icon: Mail,
    label: 'Draft a welcome email',
    prompt: 'Draft a 3-email welcome flow for new subscribers. For each email give me a subject line, preview text and the full body copy. Keep the tone warm and on-brand.'
  },
  {
    icon: TrendingUp,
    label: 'Analyse my store',
    prompt: 'Look at my store snapshot and tell me the three biggest opportunities to increase revenue in the next 30 days. Be specific about what to change and why.'
  },
  {
    icon: Package,
    label: 'Restock priorities',
    prompt: 'Based on my bestsellers and low-stock products, which products should I restock first and in what quantities? Explain the reasoning briefly.'
  }
]

export function SidekickChat({
  initialSettings,
  variant = 'page',
  onSettingsChange
}: {
  initialSettings?: Settings | null
  variant?: 'page' | 'panel'
  onSettingsChange?: (s: Settings) => void
}) {
  const compact = variant === 'panel'
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({})
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null)
  const [form, setForm] = useState({
    apiKey: '',
    baseUrl: initialSettings?.baseUrl || '',
    model: initialSettings?.model || ''
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/ai/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || cancelled) return
        setSettings(d)
        setForm({ apiKey: '', baseUrl: d.baseUrl, model: d.model })
        onSettingsChange?.(d)
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true)
    window.addEventListener('sidekick:settings', openSettings)
    return () => window.removeEventListener('sidekick:settings', openSettings)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const updateAssistant = useCallback((index: number, patch: (m: Message) => Message) => {
    setMessages(prev => prev.map((m, i) => i === index ? patch(m) : m))
  }, [])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setError(null)
    setInput('')
    const history = [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content }]
    const assistantIndex = messages.length + 1
    setMessages([
      ...messages,
      { role: 'user', content },
      { role: 'assistant', content: '', thinking: '', streaming: true }
    ])
    setLoading(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal
      })

      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || !contentType.includes('text/event-stream')) {
        const data = await res.json().catch(() => ({} as any))
        if (data.error === 'NO_KEY') {
          setError('Add your AI API key to start using the assistant.')
          setSettingsOpen(true)
        } else {
          throw new Error(data.error || data.message || 'The assistant could not respond.')
        }
        setMessages(prev => prev.filter((_, i) => i !== assistantIndex))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('The assistant did not return a stream.')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split(/\r?\n\r?\n/)
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          for (const line of chunk.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue
            const raw = line.slice(5).trim()
            if (!raw) continue
            let event: any
            try { event = JSON.parse(raw) } catch { continue }

            if (event.type === 'thinking') {
              updateAssistant(assistantIndex, m => ({ ...m, thinking: (m.thinking || '') + event.text }))
            } else if (event.type === 'delta') {
              updateAssistant(assistantIndex, m => ({ ...m, content: m.content + event.text }))
            } else if (event.type === 'error') {
              setError(event.message || 'The assistant hit an error.')
              if (event.code === 'NO_KEY') setSettingsOpen(true)
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || 'The assistant could not respond.')
    } finally {
      setMessages(prev => {
        const next = prev.map((m, i) => i === assistantIndex ? { ...m, streaming: false } : m)
        return next.filter((m, i) => !(i === assistantIndex && !m.content && !m.thinking))
      })
      setLoading(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [input, loading, messages, updateAssistant])

  const stop = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  const clear = () => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setExpandedThoughts({})
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not save settings')
      setSettings(d)
      onSettingsChange?.(d)
      setForm({ apiKey: '', baseUrl: d.baseUrl, model: d.model })
      toast.success('AI settings saved', d.hasKey ? 'Your assistant is ready' : 'Add an API key to start')
      setSettingsOpen(false)
    } catch (e: any) {
      toast.error('Could not save', e.message)
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    try {
      if (form.apiKey || form.baseUrl !== settings?.baseUrl || form.model !== settings?.model) {
        const sr = await fetch('/api/admin/ai/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        const sd = await sr.json()
        if (!sr.ok) throw new Error(sd.error || 'Could not save settings')
        setSettings(sd)
        onSettingsChange?.(sd)
        setForm({ apiKey: '', baseUrl: sd.baseUrl, model: sd.model })
      }
      const r = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Reply with exactly: connection ok' }], temperature: 0 })
      })
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.error === 'NO_KEY' ? 'No API key configured' : d.error)
      }
      const text = await r.text()
      const reply = text.split('\n')
        .filter(l => l.startsWith('data:'))
        .map(l => { try { return JSON.parse(l.slice(5).trim()) } catch { return null } })
        .filter(e => e?.type === 'delta')
        .map(e => e.text).join('')
      toast.success('Connection works', `Model replied: ${reply.slice(0, 80) || 'ok'}`)
    } catch (e: any) {
      toast.error('Connection failed', e.message)
    } finally {
      setTesting(false)
    }
  }

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopied(index)
    setTimeout(() => setCopied(null), 1600)
  }

  const visibleSuggestions = compact ? SUGGESTIONS.slice(0, 2) : SUGGESTIONS

  return (
    <div className={cn('flex flex-col min-h-0', compact ? 'flex-1 h-full' : 'sf-card overflow-hidden')} style={compact ? undefined : { minHeight: 560 }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e3e3e3] bg-[#fafafa] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0">
            <Sparkles className="h-3 w-3" />
          </span>
          <div className="min-w-0">
            {!compact && (
              <p className="text-[12px] font-semibold text-[#1a1a1a] leading-tight flex items-center gap-1.5">
                Sidekick
                {loading && <span className="text-[10px] font-normal text-[#8a8a8a]">thinking…</span>}
              </p>
            )}
            <p className={cn('text-[#8a8a8a] leading-tight truncate', compact ? 'text-[11px]' : 'text-[10px]')}>
              {loading
                ? 'Thinking…'
                : settings?.hasKey
                  ? `Connected · ${settings.model}`
                  : 'Knows your products, orders and customers'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button onClick={clear} className="sf-btn sf-btn-secondary !h-7 !px-2 !text-[11px]" title="Clear conversation">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="sf-btn sf-btn-secondary !h-7 !px-2 !text-[11px]"
            title="AI settings"
            aria-label="AI settings"
          >
            <Settings2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className={cn('flex-1 overflow-y-auto p-4 space-y-4 bg-white', !compact && 'max-h-[480px]')}
        style={compact ? undefined : { minHeight: 300 }}
      >
        {messages.length === 0 && (
          <div className={cn('mx-auto', compact ? 'py-2' : 'max-w-2xl py-4')}>
            <div className={cn('rounded-xl bg-[#1a1a1a] text-white p-4', compact ? 'mb-3' : 'mb-4 p-5')}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/60 mb-1">Your AI sidekick</p>
              <p className={cn('font-semibold leading-snug', compact ? 'text-[15px]' : 'text-[17px]')}>
                What should we improve today?
              </p>
              <p className="text-[11px] text-white/70 mt-1.5">
                Product copy, campaigns, sales analysis, restock priorities — grounded in your live store.
              </p>
            </div>
            <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
              {visibleSuggestions.map(s => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="text-left rounded-xl border border-[#e3e3e3] p-3 hover:border-[#1a1a1a] hover:bg-[#fafafa] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-[#f1f1f1] flex items-center justify-center group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors">
                      <s.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[12px] font-medium text-[#1a1a1a]">{s.label}</span>
                    <ArrowUpRight className="h-3 w-3 ml-auto text-[#8a8a8a]" />
                  </div>
                  {!compact && <p className="text-[11px] text-[#8a8a8a] mt-2 line-clamp-2">{s.prompt}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && (
              <span className="h-6 w-6 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3 w-3" />
              </span>
            )}
            <div className={cn('max-w-[88%] group', m.role === 'user' ? 'order-1' : '')}>
              {m.role === 'assistant' && m.thinking && (
                <div className="mb-1.5">
                  <button
                    onClick={() => setExpandedThoughts(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#616161] hover:text-[#1a1a1a]"
                  >
                    {m.streaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                    {m.streaming ? 'Thinking…' : 'Thought process'}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', (expandedThoughts[i] || m.streaming) ? 'rotate-180' : '')} />
                  </button>
                  {(expandedThoughts[i] || m.streaming) && (
                    <pre data-sidekick-thinking className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#f7f7f7] border border-[#efefef] px-3 py-2 text-[11px] leading-relaxed text-[#616161] font-sans">
                      {m.thinking}
                      {m.streaming && <span className="inline-block w-1 h-3 align-middle bg-[#8a8a8a] animate-pulse ml-0.5" />}
                    </pre>
                  )}
                </div>
              )}

              <div className={cn(
                'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                m.role === 'user'
                  ? 'bg-[#1a1a1a] text-white rounded-br-md'
                  : 'bg-[#f7f7f7] text-[#303030] rounded-bl-md border border-[#efefef]'
              )}>
                {m.role === 'assistant' ? (
                  m.content ? (
                    <div className="ai-markdown" data-sidekick-answer>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                      {m.streaming && <span className="inline-block w-1.5 h-3.5 align-middle bg-[#8a8a8a] animate-pulse ml-0.5" />}
                    </div>
                  ) : m.streaming ? (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] animate-bounce" style={{ animationDelay: '240ms' }} />
                    </div>
                  ) : null
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>

              {m.role === 'assistant' && m.content && !m.streaming && (
                <button
                  onClick={() => copyMessage(m.content, i)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#8a8a8a] hover:text-[#1a1a1a] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === i ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-[#f5c6c0] bg-[#fdf3f2] px-3 py-2 text-[12px] text-[#8e1f16]">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[#e3e3e3] p-3 bg-white shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            rows={1}
            placeholder={settings && !settings.hasKey ? 'Add an API key in AI settings to chat…' : 'Ask anything about your store…'}
            className="flex-1 resize-none rounded-xl border border-[#d9d9d9] px-3 py-2.5 text-[13px] outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-black/5 max-h-32"
            style={{ minHeight: 42 }}
          />
          {loading ? (
            <button
              onClick={stop}
              className="h-[42px] w-[42px] rounded-xl bg-[#303030] text-white flex items-center justify-center shrink-0 hover:bg-[#1a1a1a]"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="h-[42px] w-[42px] rounded-xl bg-[#1a1a1a] text-white flex items-center justify-center shrink-0 hover:bg-[#303030] disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-[#8a8a8a] mt-2">
          Enter to send · Shift+Enter for a new line · Answers use live store data and may be imperfect.
        </p>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="admin-shell max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> AI provider settings</DialogTitle>
            <DialogDescription>
              Bring your own key. Works with OpenAI, Groq, OpenRouter, Together, Ollama and any OpenAI-compatible chat completions API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1">API key</label>
              <input
                type="password"
                autoComplete="off"
                placeholder={settings?.hasKey ? `Saved: ${settings.maskedKey} (leave blank to keep)` : 'sk-…'}
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="sf-input"
              />
              <p className="text-[11px] text-[#8a8a8a] mt-1">
                Stored server-side in your database. It is never sent to the browser again after saving.
              </p>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1">API base URL</label>
              <input
                placeholder="https://api.openai.com/v1"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                className="sf-input"
              />
              <p className="text-[11px] text-[#8a8a8a] mt-1">
                https://api.openai.com/v1 · https://api.groq.com/openai/v1 · https://openrouter.ai/api/v1 · http://localhost:11434/v1
              </p>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1">Model</label>
              <input
                placeholder="gpt-4o-mini"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="sf-input"
              />
              <p className="text-[11px] text-[#8a8a8a] mt-1">
                e.g. gpt-4o-mini, llama-3.3-70b-versatile, claude-3-5-sonnet
              </p>
            </div>

            {settings?.hasKey && (
              <div className="flex items-center justify-between rounded-lg bg-[#f7f7f7] px-3 py-2">
                <span className="text-[12px] text-[#616161]">Stored key: <span className="font-mono">{settings.maskedKey}</span></span>
                <button
                  onClick={async () => {
                    if (!confirm('Remove the stored API key?')) return
                    const r = await fetch('/api/admin/ai/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clearKey: true })
                    })
                    const d = await r.json()
                    if (r.ok) {
                      setSettings(d)
                      onSettingsChange?.(d)
                      toast.success('API key removed')
                    } else toast.error('Could not remove key', d.error)
                  }}
                  className="text-[11px] font-medium text-[#8e1f16] hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button onClick={saveSettings} disabled={saving} className="sf-btn sf-btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save settings
              </button>
              <button onClick={testConnection} disabled={testing} className="sf-btn sf-btn-secondary disabled:opacity-50">
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Test connection
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
