// Fulfillment provider abstraction layer
// Similar to the payment provider pattern — pluggable interface for
// Printify, Printful, CJ Dropshipping, and future providers.
// Orders are auto-sent to the provider when marked as PAID.

import { db } from '../db'

export class FulfillmentError extends Error {
  constructor(message, code = 'FULFILLMENT_ERROR') {
    super(message)
    this.code = code
  }
}

// ============ Interface ============
export class FulfillmentProvider {
  constructor(config) { this.config = config }
  get name() { return 'base' }
  get isConfigured() { return false }
  async listProducts(params) { return [] }
  async importProduct(productId) { throw new Error('not implemented') }
  async createOrder(order) { throw new Error('not implemented') }
  async getOrderStatus(providerOrderId) { throw new Error('not implemented') }
  async syncInventory() { return { synced: 0 } }
}

// ============ Credential store (DB-backed, same as payments) ============
let credCache = { ts: 0, data: new Map() }
const CRED_TTL = 1000 * 30

async function getCredential(key) {
  const now = Date.now()
  if (now - credCache.ts > CRED_TTL) {
    try {
      const rows = await db.storeSetting.findMany({ where: { key: { startsWith: 'fulfillment_' } } })
      credCache = { ts: now, data: new Map(rows.map(r => [r.key, r.value])) }
    } catch { /* ignore */ }
  }
  const dbVal = credCache.data.get(`fulfillment_${key}`)
  if (dbVal && dbVal.length > 0) return dbVal
  return process.env[key] || ''
}

export async function setFulfillmentCredential(key, value) {
  await db.storeSetting.upsert({
    where: { key: `fulfillment_${key}` },
    update: { value: String(value || '') },
    create: { key: `fulfillment_${key}`, value: String(value || '') }
  })
  credCache = { ts: 0, data: new Map() }
}

// ============ Printful ============
// https://developers.printful.com/
export class PrintfulProvider extends FulfillmentProvider {
  get name() { return 'printful' }
  get baseUrl() { return 'https://api.printful.com' }

  async getApiKey() { return await getCredential('PRINTFUL_API_KEY') }
  async isConfigured() { return !!(await this.getApiKey()) }

  async request(path, init = {}) {
    const apiKey = await this.getApiKey()
    if (!apiKey) throw new FulfillmentError('Printful API key not configured', 'NOT_CONFIGURED')
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    })
    if (!res.ok) {
      let msg = `Printful API error ${res.status}`
      try { msg = (await res.json()).message || msg } catch {}
      throw new FulfillmentError(msg, res.status)
    }
    if (res.status === 204) return null
    return res.json()
  }

  async listStores() {
    const data = await this.request('/stores')
    return data.result || []
  }

  async listProducts(storeId, page = 1, limit = 50) {
    const qs = new URLSearchParams({ limit: String(limit), page: String(page) })
    const data = await this.request(`/store/products?${qs.toString()}`)
    return data
  }

  async getProduct(storeId, productId) {
    const data = await this.request(`/store/products/${productId}`)
    return data.result
  }

  async importProduct(storeId, printfulProductId) {
    const p = await this.getProduct(storeId, printfulProductId)
    return this.mapToLocalProduct(p)
  }

  mapToLocalProduct(printfulProduct) {
    const syncProduct = printfulProduct.sync_product || {}
    const syncVariants = printfulProduct.sync_variants || []
    return {
      name: syncProduct.name,
      description: syncProduct.description || '',
      price: parseFloat(syncVariants[0]?.retail_price || '0'),
      sku: syncVariants[0]?.sku || '',
      images: syncProduct.thumbnail_url ? [{ url: syncProduct.thumbnail_url }] : [],
      variants: syncVariants.map(v => ({
        name: v.name,
        sku: v.sku,
        price: parseFloat(v.retail_price || '0'),
        inventoryQty: v.availability?.stock || 0
      })),
      externalId: String(syncProduct.id),
      provider: 'printful'
    }
  }

  async createOrder(order) {
    const apiKey = await this.getApiKey()
    if (!apiKey) throw new FulfillmentError('Printful not configured', 'NOT_CONFIGURED')

    const lineItems = order.items
      .filter(it => it.printfulVariantId) // only items linked to Printful
      .map(it => ({
        sync_variant_id: parseInt(it.printfulVariantId),
        quantity: it.quantity
      }))

    if (lineItems.length === 0) return null

    const payload = {
      external_id: order.id,
      recipient: {
        name: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
        address1: order.shippingAddress?.address1 || '',
        address2: order.shippingAddress?.address2 || '',
        city: order.shippingAddress?.city || '',
        state_code: order.shippingAddress?.state || '',
        zip: order.shippingAddress?.postalCode || '',
        country_code: order.shippingAddress?.country || 'US',
        phone: order.shippingAddress?.phone || '',
        email: order.email
      },
      items: lineItems
    }

    const data = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return data.result
  }
}

// ============ CJ Dropshipping ============
// https://developers.cjdropshipping.com/
export class CJDropshippingProvider extends FulfillmentProvider {
  get name() { return 'cj' }
  get baseUrl() { return 'https://developers.cjdropshipping.com' }

  async getEmail() { return await getCredential('CJ_EMAIL') }
  async getApiKey() { return await getCredential('CJ_API_KEY') }
  async isConfigured() { return !!(await this.getEmail() && await this.getApiKey()) }

  async request(path, init = {}) {
    const [email, apiKey] = await Promise.all([this.getEmail(), this.getApiKey()])
    if (!email || !apiKey) throw new FulfillmentError('CJ Dropshipping not configured. Add your email and API key.', 'NOT_CONFIGURED')

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'CJ-Access-Token': apiKey,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    })
    if (!res.ok) {
      let msg = `CJ API error ${res.status}`
      try { msg = (await res.json()).message || msg } catch {}
      throw new FulfillmentError(msg, res.status)
    }
    return res.json()
  }

  async listProducts(page = 1, pageSize = 20) {
    const data = await this.request(`/api/v1/product/list?page=${page}&pageSize=${pageSize}`)
    return data.data?.list || []
  }

  async getProduct(productId) {
    const data = await this.request(`/api/v1/product/get?pid=${productId}`)
    return data.data
  }

  async importProduct(cjProductId) {
    const p = await this.getProduct(cjProductId)
    return this.mapToLocalProduct(p)
  }

  mapToLocalProduct(cjProduct) {
    return {
      name: cjProduct.productNameEn || cjProduct.productName || '',
      description: cjProduct.productDescription || '',
      price: parseFloat(cjProduct.variantList?.[0]?.sellPrice || cjProduct.sellPrice || '0'),
      sku: cjProduct.pid || '',
      images: (cjProduct.productImageEn || cjProduct.productImage || '').split(',').filter(Boolean).map(url => ({ url: url.trim() })),
      variants: (cjProduct.variantList || []).map(v => ({
        name: v.variantNameEn || v.variantName || '',
        sku: v.vid || '',
        price: parseFloat(v.sellPrice || '0'),
        inventoryQty: v.stock || 0
      })),
      externalId: cjProduct.pid || '',
      provider: 'cj'
    }
  }

  async createOrder(order) {
    const [email, apiKey] = await Promise.all([this.getEmail(), this.getApiKey()])
    if (!email || !apiKey) return null

    const lineItems = order.items
      .filter(it => it.cjVariantId)
      .map(it => ({
        vid: it.cjVariantId,
        quantity: it.quantity
      }))

    if (lineItems.length === 0) return null

    const payload = {
      orderNum: order.orderNumber,
      recipientName: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
      recipientPhone: order.shippingAddress?.phone || '',
      recipientCountry: order.shippingAddress?.country || 'US',
      recipientState: order.shippingAddress?.state || '',
      recipientCity: order.shippingAddress?.city || '',
      recipientAddress: order.shippingAddress?.address1 || '',
      recipientZip: order.shippingAddress?.postalCode || '',
      shippingMethod: 'EXPRESS',
      productList: lineItems
    }

    const data = await this.request('/api/v1/shoppingOrder/createOrder', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return data.data
  }
}

// ============ Factory ============
export function getFulfillmentProvider(name) {
  switch (name) {
    case 'printful': return new PrintfulProvider({})
    case 'cj': return new CJDropshippingProvider({})
    default: return null
  }
}

// ============ Settings ============
export async function getFulfillmentSettings() {
  const [printfulKey, cjEmail, cjKey] = await Promise.all([
    getCredential('PRINTFUL_API_KEY'),
    getCredential('CJ_EMAIL'),
    getCredential('CJ_API_KEY')
  ])

  const rows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'fulfillment_enabled_' } }
  }).catch(() => [])
  const enabledMap = new Map(rows.map(r => [r.key, r.value]))

  return {
    printful: {
      enabled: enabledMap.get('fulfillment_enabled_printful') === 'true',
      configured: !!printfulKey,
      apiKey: printfulKey ? '••••••••••••' : ''
    },
    cj: {
      enabled: enabledMap.get('fulfillment_enabled_cj') === 'true',
      configured: !!(cjEmail && cjKey),
      email: cjEmail || '',
      apiKey: cjKey ? '••••••••••••' : ''
    },
    printify: {
      enabled: true, // Printify is managed separately via the existing integration
      configured: !!(process.env.PRINTIFY_API_KEY || await getCredential('PRINTIFY_API_KEY'))
    }
  }
}

export async function getEnabledProviders() {
  const settings = await getFulfillmentSettings()
  const list = []
  if (settings.printify.enabled && settings.printify.configured) list.push('printify')
  if (settings.printful.enabled && settings.printful.configured) list.push('printful')
  if (settings.cj.enabled && settings.cj.configured) list.push('cj')
  return list
}

// ============ Auto-fulfillment ============
// Called when an order is marked as PAID — sends the order to all
// configured fulfillment providers that have linked items.
export async function autoFulfillOrder(order) {
  try {
    const enabled = await getEnabledProviders()
    const results = []

    for (const providerName of enabled) {
      const provider = getFulfillmentProvider(providerName)
      if (!provider) continue

      try {
        const result = await provider.createOrder(order)
        if (result) {
          results.push({ provider: providerName, success: true, orderId: result.id || result.orderId })

          // Update the order with the provider's order ID
          await db.order.update({
            where: { id: order.id },
            data: {
              printifyOrderId: providerName === 'printify' ? (result.id || '') : undefined
            }
          }).catch(() => {})
        }
      } catch (e) {
        console.error(`[FULFILLMENT] ${providerName} failed:`, e.message)
        results.push({ provider: providerName, success: false, error: e.message })
      }
    }

    return results
  } catch (e) {
    console.error('[FULFILLMENT] Auto-fulfill failed:', e.message)
    return []
  }
}
