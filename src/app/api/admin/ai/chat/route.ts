import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  getAiConfig, buildStoreContext, streamChatCompletion, type ChatMessage
} from '@/lib/ai'

export const maxDuration = 120

const SYSTEM_PROMPT = `You are Shopflar Sidekick, an expert ecommerce operator embedded in the merchant's admin panel.
You help with merchandising, product copy, pricing, email marketing, customer retention, store design and analytics.

Rules:
- Be concise and practical. Prefer short paragraphs and tight bullet lists.
- When writing copy (product descriptions, emails, subject lines), give finished, ready-to-paste text.
- Use the store snapshot for numbers. Never invent order counts, revenue or product names that are not in it.
- If the merchant asks you to change the store, explain exactly where to do it in the admin (Products, Themes, Campaigns, Discounts…) and offer the copy or settings to use.
- Never reveal or ask for API keys, passwords or other secrets.
- Format with Markdown: headings sparingly, **bold** for emphasis, lists for steps.`

const encoder = new TextEncoder()

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

    const config = await getAiConfig()
    if (!config.apiKey) {
      return NextResponse.json({
        error: 'NO_KEY',
        message: 'Add your AI API key to start using the assistant. It stays on your server.'
      }, { status: 400 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false
        const send = (event: Record<string, any>) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          } catch {
            closed = true
          }
        }

        try {
          // Visible work before the first token, so the UI can show what the
          // assistant is doing even when the model exposes no reasoning.
          send({ type: 'thinking', text: 'Reading your live store data…\n' })
          let context = ''
          try { context = await buildStoreContext() } catch { context = '' }
          send({ type: 'thinking', text: 'Reviewing products, orders and customers…\n' })

          const system = context
            ? `${SYSTEM_PROMPT}\n\nCurrent store snapshot (live data):\n${context}`
            : SYSTEM_PROMPT

          send({ type: 'thinking', text: 'Planning a concise answer…\n' })

          let characters = 0
          await streamChatCompletion(
            config,
            [{ role: 'system', content: system }, ...messages],
            { temperature: Number(body.temperature ?? 0.6), maxTokens: 1100 },
            {
              onThinking: (text) => send({ type: 'thinking', text }),
              onDelta: (text) => {
                characters += text.length
                send({ type: 'delta', text })
              }
            },
            req.signal
          )

          send({ type: 'done', characters })
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            send({
              type: 'error',
              message: e.message === 'NO_KEY'
                ? 'Add your AI API key in AI settings to start using the assistant.'
                : (e.message || 'The AI request failed.'),
              code: e.message === 'NO_KEY' ? 'NO_KEY' : undefined
            })
          }
        } finally {
          closed = true
          try { controller.close() } catch {}
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'The AI request failed.' }, { status: 400 })
  }
}
