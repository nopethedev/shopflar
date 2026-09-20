// Printify integration service
// Abstracts all Printify API calls behind a clean interface.
// Uses PRINTIFY_API_KEY env var.

const PRINTIFY_BASE = 'https://api.printify.com/v1'

export class PrintifyError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
  }
}

export class PrintifyClient {
  constructor(apiKey = process.env.PRINTIFY_API_KEY) {
    this.apiKey = apiKey
  }

  get isConfigured() { return !!this.apiKey }

  async request(path, init = {}) {
    if (!this.isConfigured) throw new PrintifyError('Printify API key not configured', 400)
    const res = await fetch(`${PRINTIFY_BASE}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    })
    if (!res.ok) {
      let msg = `Printify API error ${res.status}`
      try { msg = (await res.json()).message || msg } catch {}
      throw new PrintifyError(msg, res.status)
    }
    if (res.status === 204) return null
    return res.json()
  }

  async listShops() {
    return this.request('/shops.json')
  }

  async listProducts(shopId, params = {}) {
    const qs = new URLSearchParams()
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.page) qs.set('page', String(params.page))
    return this.request(`/shops/${shopId}/products.json?${qs.toString()}`)
  }

  async getProduct(shopId, productId) {
    return this.request(`/shops/${shopId}/products/${productId}.json`)
  }

  async createProduct(shopId, payload) {
    return this.request(`/shops/${shopId}/products.json`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async updateProduct(shopId, productId, payload) {
    return this.request(`/shops/${shopId}/products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }

  async publishProduct(shopId, productId) {
    return this.request(`/shops/${shopId}/products/${productId}/publish.json`, {
      method: 'POST',
      body: JSON.stringify({ title: true, description: true, images: true, variants: true, tags: true, key_features: true, shipping_template: true })
    })
  }

  async deleteProduct(shopId, productId) {
    return this.request(`/shops/${shopId}/products/${productId}.json`, { method: 'DELETE' })
  }

  async submitOrder(shopId, orderPayload) {
    return this.request(`/shops/${shopId}/orders.json`, {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    })
  }
}

export const printify = new PrintifyClient()
