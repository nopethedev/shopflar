import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { chatCompletion, buildStoreContext, type ChatMessage } from '@/lib/ai'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are Shopflar Sidekick, an expert ecommerce operator embedded in the merchant's admin panel.
You help with merchandising, product copy, pricing, email marketing, customer retention, store design and analytics.

Rules:
- Be concise and practical. Prefer short paragraphs and tight bullet lists.
- When writing copy (product descriptions, emails, subject lines), give finished, ready-to-paste text.
- Use the store snapshot for numbers. Never invent order counts, revenue or product names that are not in it.
- If the merchant asks you to change the store, explain exactly where to do it in the admin (Products, Themes, Campaigns, Discounts…) and offer the copy or settings to use.
- Never reveal or ask for API keys, passwords or other secrets.
- Format with Markdown: headings sparingly, **bold** for emphasis, lists for steps.`

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const incoming = Array.isArray(body.messages) ? body.messages : []

    const messages: ChatMessage[] = incoming
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-16)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 8000) }))

    if (messages.length === 0) {
      return NextResponse.json({ error: 'Send a message to get started.' }, { status: 400 })
    }

    let context = ''
    try { context = await buildStoreContext() } catch { context = '' }
    const system = context
      ? `${SYSTEM_PROMPT}\n\nCurrent store snapshot (live data):\n${context}`
      : SYSTEM_PROMPT

    try {
      const reply = await chatCompletion([{ role: 'system', content: system }, ...messages], {
        temperature: Number(body.temperature ?? 0.6),
        maxTokens: 900
      })
      return NextResponse.json({ reply })
    } catch (e: any) {
      if (e.message === 'NO_KEY') {
        return NextResponse.json({
          error: 'NO_KEY',
          message: 'Add your AI API key to start using the assistant. It stays on your server.'
        }, { status: 400 })
      }
      return NextResponse.json({ error: e.message || 'The AI request failed.' }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
