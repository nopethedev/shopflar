// Payment provider abstraction layer
// Supports Stripe and PayPal via pluggable interface.
// Server-side verification only — never trust payment status from frontend.
//
// Credentials can be configured from the admin panel (stored in DB) OR
// via environment variables (DB takes precedence — useful for switching
// between sandbox and live without redeploying).

import { db } from '../db'

export class PaymentError extends Error {
  constructor(message, code = 'PAYMENT_ERROR') {
    super(message)
    this.code = code
  }
}

// ============ Credential store (DB-first, env fallback) ============
let credCache = { ts: 0, data: new Map() }
const CRED_TTL = 1000 * 30 // 30 seconds

async function getCredential(key) {
  const now = Date.now()
  if (now - credCache.ts > CRED_TTL) {
    try {
      const rows = await db.storeSetting.findMany({
        where: { key: { startsWith: 'cred_' } }
      })
      credCache = { ts: now, data: new Map(rows.map(r => [r.key, r.value])) }
    } catch {
      // ignore db errors — fall back to env
    }
  }
  // DB value takes precedence over env
  const dbVal = credCache.data.get(`cred_${key}`)
  if (dbVal && dbVal.length > 0) return dbVal
  return process.env[key] || ''
}

export async function setCredential(key, value) {
  await db.storeSetting.upsert({
    where: { key: `cred_${key}` },
    update: { value: String(value || '') },
    create: { key: `cred_${key}`, value: String(value || '') }
  })
  // Invalidate cache
  credCache = { ts: 0, data: new Map() }
}

export async function listCredentials() {
  const rows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'cred_' } }
  })
  const map = new Map(rows.map(r => [r.key.replace('cred_', ''), r.value]))
  return map
}

// ============ Interface ============
export class PaymentProvider {
  constructor(config) {
    this.config = config
  }
  get name() { return 'base' }
  get isConfigured() { return false }
  async createPaymentIntent(opts) { throw new Error('not implemented') }
  async verifyPayment(reference) { throw new Error('not implemented') }
  async refundPayment(reference, amount) { throw new Error('not implemented') }
  async handleWebhook(req) { throw new Error('not implemented') }
}

// ============ Stripe ============
export class StripeProvider extends PaymentProvider {
  get name() { return 'stripe' }
  async getSecretKey() {
    return await getCredential('STRIPE_SECRET_KEY')
  }
  async isConfigured() {
    const key = await this.getSecretKey()
    return !!key
  }
  async getClient() {
    const secretKey = await this.getSecretKey()
    if (!secretKey) throw new PaymentError('Stripe is not configured. Add your API key in Admin → Payments.', 'STRIPE_NOT_CONFIGURED')
    const Stripe = (await import('stripe')).default
    return new Stripe(secretKey, { apiVersion: '2024-06-20' })
  }
  async createPaymentIntent({ amount, currency, metadata = {}, orderId }) {
    const stripe = await this.getClient()
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: { ...metadata, orderId },
      automatic_payment_methods: { enabled: true }
    })
    return { id: intent.id, clientSecret: intent.client_secret, status: intent.status }
  }
  async verifyPayment(reference) {
    const stripe = await this.getClient()
    const intent = await stripe.paymentIntents.retrieve(reference)
    return {
      success: intent.status === 'succeeded',
      status: intent.status,
      amount: intent.amount / 100,
      currency: intent.currency.toUpperCase(),
      raw: intent
    }
  }
  async refundPayment(reference, amount) {
    const stripe = await this.getClient()
    const refund = await stripe.refunds.create({
      payment_intent: reference,
      amount: amount ? Math.round(amount * 100) : undefined
    })
    return { id: refund.id, status: refund.status, amount: refund.amount / 100 }
  }
  async handleWebhook(req) {
    const stripe = await this.getClient()
    const sig = req.headers.get('stripe-signature')
    const webhookSecret = await getCredential('STRIPE_WEBHOOK_SECRET')
    if (!sig || !webhookSecret) {
      throw new PaymentError('Missing Stripe signature or webhook secret', 'WEBHOOK_SIGNATURE_MISSING')
    }
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    return event
  }
}

// ============ PayPal (REST API + IPN support) ============
export class PayPalProvider extends PaymentProvider {
  get name() { return 'paypal' }
  async getClientId() {
    return await getCredential('PAYPAL_CLIENT_ID')
  }
  async getClientSecret() {
    return await getCredential('PAYPAL_CLIENT_SECRET')
  }
  async getMode() {
    // 'live' or 'sandbox'
    const mode = await getCredential('PAYPAL_MODE')
    return mode || process.env.PAYPAL_MODE || 'sandbox'
  }
  async isConfigured() {
    const [id, secret] = await Promise.all([this.getClientId(), this.getClientSecret()])
    return !!id && !!secret
  }
  async isIpnConfigured() {
    const url = await getCredential('PAYPAL_IPN_URL')
    return !!url
  }
  get baseUrl() {
    // Synchronous accessor — uses env (or 'sandbox' default). For DB-backed mode,
    // callers should use getBaseUrl() instead.
    return process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  }
  async getBaseUrl() {
    const mode = await this.getMode()
    return mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  }
  async getAccessToken() {
    const [clientId, clientSecret] = await Promise.all([this.getClientId(), this.getClientSecret()])
    if (!clientId || !clientSecret) {
      throw new PaymentError('PayPal is not configured. Add your API credentials in Admin → Payments.', 'PAYPAL_NOT_CONFIGURED')
    }
    const baseUrl = await this.getBaseUrl()
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })
    if (!res.ok) throw new PaymentError('PayPal auth failed', 'PAYPAL_AUTH_FAILED')
    const data = await res.json()
    return data.access_token
  }
  async createPaymentIntent({ amount, currency, description, orderId }) {
    const token = await this.getAccessToken()
    const baseUrl = await this.getBaseUrl()
    const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: currency, value: amount.toFixed(2) },
          description: description || 'Order',
          custom_id: orderId
        }]
      })
    })
    const data = await res.json()
    if (!res.ok) throw new PaymentError(data.message || 'PayPal order creation failed', 'PAYPAL_CREATE_FAILED')
    return { id: data.id, status: data.status, links: data.links }
  }
  async verifyPayment(reference) {
    const token = await this.getAccessToken()
    const baseUrl = await this.getBaseUrl()
    const res = await fetch(`${baseUrl}/v2/checkout/orders/${reference}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new PaymentError(data.message || 'PayPal verification failed', 'PAYPAL_VERIFY_FAILED')
    if (data.status === 'APPROVED') {
      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${reference}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const captureData = await captureRes.json()
      if (!captureRes.ok) throw new PaymentError(captureData.message || 'PayPal capture failed', 'PAYPAL_CAPTURE_FAILED')
      const purchase = captureData.purchase_units?.[0]?.payments?.captures?.[0]
      return {
        success: purchase?.status === 'COMPLETED',
        status: captureData.status,
        amount: parseFloat(purchase?.amount?.value || '0'),
        currency: purchase?.amount?.currency_code,
        raw: captureData
      }
    }
    return {
      success: data.status === 'COMPLETED',
      status: data.status,
      amount: parseFloat(data.purchase_units?.[0]?.amount?.value || '0'),
      currency: data.purchase_units?.[0]?.amount?.currency_code,
      raw: data
    }
  }
  async refundPayment(reference, amount) {
    const token = await this.getAccessToken()
    const baseUrl = await this.getBaseUrl()
    const res = await fetch(`${baseUrl}/v2/payments/captures/${reference}/refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(amount ? { amount: { value: amount.toFixed(2), currency_code: 'USD' } } : {})
    })
    const data = await res.json()
    if (!res.ok) throw new PaymentError(data.message || 'PayPal refund failed', 'PAYPAL_REFUND_FAILED')
    return { id: data.id, status: data.status, amount: parseFloat(data.amount?.value || '0') }
  }

  // ============ PayPal IPN (Instant Payment Notification) ============
  // Used for personal/business accounts that rely on IPN instead of webhooks.
  // PayPal sends a POST to your /api/payments/webhook/paypal/ipn endpoint,
  // we then POST it back to PayPal for verification.
  async verifyIpn(body) {
    // PayPal verification: send back the exact same body with cmd=_notify-validate prepended
    const params = new URLSearchParams(body)
    params.append('cmd', '_notify-validate')

    const baseUrl = await this.getBaseUrl()
    const verifyUrl = `${baseUrl}/cgi-bin/webscr`

    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const text = await res.text()
    return text.trim() === 'VERIFIED'
  }
}

// ============ COD (Cash on Delivery) — fallback for demo ============
export class CODProvider extends PaymentProvider {
  get name() { return 'cod' }
  get isConfigured() { return true }
  async createPaymentIntent({ amount, orderId }) {
    return { id: `cod_${orderId}`, status: 'pending', clientSecret: null }
  }
  async verifyPayment(reference) {
    return { success: true, status: 'pending_cod', amount: 0, currency: 'USD', raw: { reference } }
  }
}

// ============ Factory ============
export function getProvider(name) {
  switch (name) {
    case 'stripe': return new StripeProvider({})
    case 'paypal': return new PayPalProvider({})
    case 'cod': return new CODProvider({})
    default: throw new PaymentError(`Unknown provider: ${name}`, 'PROVIDER_UNKNOWN')
  }
}

// ============ Settings persistence ============
export async function getPaymentSettings() {
  const rows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'payment_' } }
  })
  const map = new Map(rows.map(r => [r.key, r.value]))

  const stripeSecret = await getCredential('STRIPE_SECRET_KEY')
  const stripePub = await getCredential('STRIPE_PUBLISHABLE_KEY')
  const stripeWebhook = await getCredential('STRIPE_WEBHOOK_SECRET')
  const paypalId = await getCredential('PAYPAL_CLIENT_ID')
  const paypalSecret = await getCredential('PAYPAL_CLIENT_SECRET')
  const paypalMode = await getCredential('PAYPAL_MODE')
  const paypalIpnUrl = await getCredential('PAYPAL_IPN_URL')

  return {
    stripe: {
      enabled: map.get('payment_stripe_enabled') === 'true',
      testMode: map.get('payment_stripe_testmode') !== 'false',
      configured: !!(stripeSecret && stripePub),
      hasWebhookSecret: !!stripeWebhook,
      publishableKey: stripePub || ''  // safe to expose
    },
    paypal: {
      enabled: map.get('payment_paypal_enabled') === 'true',
      testMode: paypalMode !== 'live',
      mode: paypalMode || 'sandbox',
      configured: !!(paypalId && paypalSecret),
      clientId: paypalId || '',  // safe to expose
      hasIpnUrl: !!paypalIpnUrl,
      ipnUrl: paypalIpnUrl || ''
    },
    cod: {
      enabled: map.get('payment_cod_enabled') !== 'false'
    }
  }
}

export async function setPaymentSetting(key, value) {
  await db.storeSetting.upsert({
    where: { key: `payment_${key}` },
    update: { value: String(value) },
    create: { key: `payment_${key}`, value: String(value) }
  })
}

export async function getAvailableProviders() {
  const settings = await getPaymentSettings()
  const list = []
  if (settings.stripe.enabled && settings.stripe.configured) list.push('stripe')
  if (settings.paypal.enabled && settings.paypal.configured) list.push('paypal')
  if (settings.cod.enabled) list.push('cod')
  return list
}
