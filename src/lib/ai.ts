// ============================================================
// Store AI assistant — bring your own API key.
//
// Works with any OpenAI-compatible chat completions endpoint:
// OpenAI, Groq, OpenRouter, Together, a local Ollama/LM Studio, …
// The key is stored server-side (StoreSetting) or read from env and is
// never returned to the browser in full.
// ============================================================

import { db } from './db'

export type AiConfig = {
  apiKey: string
  baseUrl: string
  model: string
  source: 'stored' | 'env' | 'none'
}

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-4o-mini'

export async function getAiConfig(): Promise<AiConfig> {
  let rows: { key: string; value: string }[] = []
  try {
    rows = await db.storeSetting.findMany({
      where: { key: { in: ['ai_api_key', 'ai_base_url', 'ai_model'] } }
    })
  } catch {
    rows = []
  }
  const map = new Map(rows.map(r => [r.key, r.value]))
  const storedKey = map.get('ai_api_key') || ''
  const storedBase = map.get('ai_base_url') || ''
  const storedModel = map.get('ai_model') || ''

  if (storedKey) {
    return {
      apiKey: storedKey,
      baseUrl: (storedBase || DEFAULT_BASE_URL).replace(/\/+$/, ''),
      model: storedModel || DEFAULT_MODEL,
      source: 'stored'
    }
  }

  const envKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ''
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
      model: process.env.AI_MODEL || DEFAULT_MODEL,
      source: 'env'
    }
  }

  return { apiKey: '', baseUrl: storedBase || DEFAULT_BASE_URL, model: storedModel || DEFAULT_MODEL, source: 'none' }
}

export function maskApiKey(key: string) {
  if (!key) return ''
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

// Calls the configured endpoint and returns the assistant text.
// Throws an Error with a human-readable message on failure.
export async function chatCompletion(messages: ChatMessage[], opts: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
  const config = await getAiConfig()
  if (!config.apiKey) {
    throw new Error('NO_KEY')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 900
      }),
      signal: controller.signal
    })

    const text = await res.text()
    let data: any = null
    try { data = JSON.parse(text) } catch { /* non-JSON error body */ }

    if (!res.ok) {
      const providerMessage = data?.error?.message || data?.message || text.slice(0, 300)
      const err = new Error(`AI provider returned ${res.status}${providerMessage ? `: ${providerMessage}` : ''}`)
      ;(err as any).status = res.status
      throw err
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('The AI provider returned an empty response.')
    return String(content)
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('The AI request timed out after 60 seconds. Try again or use a smaller model.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// Compact, factual store snapshot injected as context so the assistant can
// answer questions about the actual store instead of guessing.
export async function buildStoreContext(): Promise<string> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const [settings, productCount, publishedCount, orderCount, revenue, revenue30, customers, topItems, lowStock, subscribers, recent] = await Promise.all([
    db.storeSetting.findMany({ where: { key: { in: ['store_name', 'currency', 'store_description'] } } }),
    db.product.count(),
    db.product.count({ where: { status: 'PUBLISHED' } }),
    db.order.count(),
    db.order.aggregate({ _sum: { total: true }, where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }),
    db.order.aggregate({ _sum: { total: true }, _count: { _all: true }, where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, createdAt: { gte: thirtyDaysAgo } } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.orderItem.groupBy({ by: ['name'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    db.product.findMany({ where: { trackInventory: true, inventoryQty: { lte: 5 }, isOutOfStock: false }, select: { name: true, inventoryQty: true }, take: 5 }),
    db.newsletterSubscriber.count({ where: { isActive: true } }),
    db.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { orderNumber: true, total: true, status: true, createdAt: true } })
  ])
  const map = new Map(settings.map(s => [s.key, s.value]))
  const paidOrders = revenue30._count._all || 0
  const currency = map.get('currency') || 'USD'

  return [
    `Store name: ${map.get('store_name') || 'Shopflar'}`,
    map.get('store_description') ? `Store description: ${map.get('store_description')}` : '',
    `Products: ${productCount} total, ${publishedCount} published`,
    `Orders: ${orderCount} lifetime, ${paidOrders} in the last 30 days`,
    `Revenue: ${(revenue._sum.total || 0).toFixed(2)} ${currency} lifetime · ${(revenue30._sum.total || 0).toFixed(2)} ${currency} in the last 30 days`,
    `Average order value (30d): ${paidOrders ? ((revenue30._sum.total || 0) / paidOrders).toFixed(2) : '0.00'} ${currency}`,
    `Customers: ${customers} · active email subscribers: ${subscribers}`,
    topItems.length ? `Bestsellers by units: ${topItems.map(i => `${i.name} (${i._sum.quantity})`).join(', ')}` : 'No sales yet',
    lowStock.length ? `Low stock: ${lowStock.map(p => `${p.name} (${p.inventoryQty} left)`).join(', ')}` : 'No low-stock products',
    recent.length ? `Recent orders: ${recent.map(o => `${o.orderNumber} ${o.total.toFixed(2)} ${o.status}`).join(', ')}` : 'No recent orders'
  ].filter(Boolean).join('\n')
}
