'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles, Send, Settings2, Loader2, Copy, Check, Trash2, KeyRound,
  AlertTriangle, Wand2, TrendingUp, Mail, Package, ArrowUpRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

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

export function AiAssistant({ storeName, initialSettings }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(initialSettings)
  const [form, setForm] = useState({ apiKey: '', baseUrl: initialSettings.baseUrl, model: initialSettings.model })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setError(null)
    setInput('')
    const next: Message[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const r = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.error === 'NO_KEY') {
          setError('Add your AI API key to start using the assistant.')
          setSettingsOpen(true)
        } else {
          throw new Error(d.error || 'The assistant could not respond.')
        }
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: d.reply }])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages])

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
      if (form.apiKey || form.baseUrl !== settings.baseUrl || form.model !== settings.model) {
        const sr = await fetch('/api/admin/ai/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        const sd = await sr.json()
        if (!sr.ok) throw new Error(sd.error || 'Could not save settings')
        setSettings(sd)
        setForm({ apiKey: '', baseUrl: sd.baseUrl, model: sd.model })
      }
      const r = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Reply with exactly: connection ok' }], temperature: 0 })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error === 'NO_KEY' ? 'No API key configured' : d.error)
      toast.success('Connection works', `Model replied: ${String(d.reply).slice(0, 80)}`)
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

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Shopflar Sidekick</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#1a1a1a]" /> AI Assistant
          </h1>
          <p className="sf-sub mt-0.5">Your merchandising, copywriting and analytics copilot for {storeName}.</p>
        </div>
        <button onClick={() => setSettingsOpen(true)} className="sf-btn sf-btn-secondary">
          <Settings2 className="h-3.5 w-3.5" /> AI settings
        </button>
      </div>

      {/* Key status banner */}
      {!settings.hasKey ? (
        <div className="sf-card p-4 border-[#f0d9a8] bg-[#fffaf0] flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#8a4b00] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#5c3300]">Connect your AI provider</p>
            <p className="text-[12px] text-[#8a4b00] mt-0.5">
              Add an API key from OpenAI, Groq, OpenRouter, Together or any OpenAI-compatible endpoint. The key is stored on your server and never exposed to the browser.
            </p>
          </div>
          <button onClick={() => setSettingsOpen(true)} className="sf-btn sf-btn-primary shrink-0">
            <KeyRound className="h-3.5 w-3.5" /> Add key
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#616161]">
          <span className="sf-badge sf-badge-success"><Check className="h-3 w-3" /> Connected</span>
          <span className="sf-badge sf-badge-neutral">{settings.model}</span>
          <span className="font-mono">{settings.maskedKey}</span>
          <span className="sf-badge sf-badge-neutral">{settings.source === 'env' ? 'from environment' : 'stored in this store'}</span>
        </div>
      )}

      {/* Chat panel */}
      <div className="sf-card overflow-hidden flex flex-col" style={{ minHeight: 520 }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e3e3e3] bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center">
              <Sparkles className="h-3 w-3" />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-[#1a1a1a] leading-tight">Sidekick</p>
              <p className="text-[10px] text-[#8a8a8a] leading-tight">Knows your products, orders and customers</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setError(null) }} className="sf-btn sf-btn-secondary h-7 px-2 text-[11px]">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white" style={{ maxHeight: 460 }}>
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto py-4">
              <div className="rounded-xl bg-[#1a1a1a] text-white p-5 mb-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-1">Your AI sidekick</p>
                <p className="text-[17px] font-semibold leading-snug">What should we improve today?</p>
                <p className="text-[12px] text-white/70 mt-1.5 max-w-md">
                  I can write product copy, plan campaigns, analyse sales and suggest what to restock — using your live store data.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map(s => (
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
                    <p className="text-[11px] text-[#8a8a8a] mt-2 line-clamp-2">{s.prompt}</p>
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
              <div className={cn('max-w-[85%] group', m.role === 'user' ? 'order-1' : '')}>
                <div className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                  m.role === 'user'
                    ? 'bg-[#1a1a1a] text-white rounded-br-md'
                    : 'bg-[#f7f7f7] text-[#303030] rounded-bl-md border border-[#efefef]'
                )}>
                  {m.role === 'assistant' ? (
                    <div className="ai-markdown">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === 'assistant' && (
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

          {loading && (
            <div className="flex gap-2.5">
              <span className="h-6 w-6 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-3 w-3" />
              </span>
              <div className="rounded-2xl rounded-bl-md bg-[#f7f7f7] border border-[#efefef] px-3.5 py-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#8a8a8a] animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[#f5c6c0] bg-[#fdf3f2] px-3 py-2 text-[12px] text-[#8e1f16]">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-[#e3e3e3] p-3 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              rows={1}
              placeholder={settings.hasKey ? 'Ask anything about your store…' : 'Add an API key to start chatting…'}
              className="flex-1 resize-none rounded-xl border border-[#d9d9d9] px-3 py-2.5 text-[13px] outline-none focus:border-[#1a1a1a] focus:ring-2 focus:ring-black/5 max-h-32"
              style={{ minHeight: 42 }}
            />
            <Button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="h-[42px] w-[42px] p-0 bg-[#1a1a1a] hover:bg-[#303030] rounded-xl shrink-0"
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-[#8a8a8a] mt-2">
            Enter to send · Shift+Enter for a new line · Answers use live store data and may be imperfect.
          </p>
        </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> AI provider settings</DialogTitle>
            <DialogDescription>
              Bring your own key. Works with OpenAI, Groq, OpenRouter, Together, Ollama and any OpenAI-compatible chat completions API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-[12px]">API key</Label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={settings.hasKey ? `Saved: ${settings.maskedKey} (leave blank to keep)` : 'sk-…'}
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Stored server-side in your database. It is never sent to the browser again after saving.
              </p>
            </div>
            <div>
              <Label className="text-[12px]">API base URL</Label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Examples: https://api.openai.com/v1 · https://api.groq.com/openai/v1 · https://openrouter.ai/api/v1 · http://localhost:11434/v1
              </p>
            </div>
            <div>
              <Label className="text-[12px]">Model</Label>
              <Input
                placeholder="gpt-4o-mini"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Use a model your provider supports, e.g. gpt-4o-mini, llama-3.3-70b-versatile, claude-3-5-sonnet.
              </p>
            </div>

            {settings.hasKey && (
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
                    if (r.ok) { setSettings(d); toast.success('API key removed') } else toast.error('Could not remove key', d.error)
                  }}
                  className="text-[11px] font-medium text-[#8e1f16] hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={saveSettings} disabled={saving} className="bg-[#1a1a1a] hover:bg-[#303030]">
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Save settings
              </Button>
              <Button onClick={testConnection} disabled={testing} variant="outline">
                {testing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Test connection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
