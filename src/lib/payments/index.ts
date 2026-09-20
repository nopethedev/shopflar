// Payment provider abstraction layer
// Supports Stripe and PayPal via pluggable interface.
// Server-side verification only — never trust payment status from frontend.

import { db } from '../db'

export class PaymentError extends Error {
  constructor(message, code = 'PAYMENT_ERROR') {
    super(message)
    this.code = code
  }
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
  get isConfigured() {
    return !!process.env.STRIPE_SECRET_KEY
  }
  async getClient() {
    if (!this.isConfigured) throw new PaymentError('Stripe is not configured', 'STRIPE_NOT_CONFIGURED')
    const Stripe = (await import('stripe')).default
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
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
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new PaymentError('Missing Stripe signature', 'WEBHOOK_SIGNATURE_MISSING')
    }
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    return event
  }
}

// ============ PayPal ============
export class PayPalProvider extends PaymentProvider {
  get name() { return 'paypal' }
  get isConfigured() {
    return !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
  }
  get baseUrl() {
    return process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  }
  async getAccessToken() {
    if (!this.isConfigured) throw new PaymentError('PayPal is not configured', 'PAYPAL_NOT_CONFIGURED')
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
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
    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
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
    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${reference}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new PaymentError(data.message || 'PayPal verification failed', 'PAYPAL_VERIFY_FAILED')
    if (data.status === 'APPROVED') {
      const captureRes = await fetch(`${this.baseUrl}/v2/checkout/orders/${reference}/capture`, {
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
    const res = await fetch(`${this.baseUrl}/v2/payments/captures/${reference}/refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(amount ? { amount: { value: amount.toFixed(2), currency_code: 'USD' } } : {})
    })
    const data = await res.json()
    if (!res.ok) throw new PaymentError(data.message || 'PayPal refund failed', 'PAYPAL_REFUND_FAILED')
    return { id: data.id, status: data.status, amount: parseFloat(data.amount?.value || '0') }
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
  return {
    stripe: {
      enabled: map.get('payment_stripe_enabled') === 'true',
      testMode: map.get('payment_stripe_testmode') !== 'false',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    },
    paypal: {
      enabled: map.get('payment_paypal_enabled') === 'true',
      testMode: process.env.PAYPAL_MODE !== 'live',
      clientId: process.env.PAYPAL_CLIENT_ID || ''
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
  if (settings.stripe.enabled && process.env.STRIPE_SECRET_KEY) list.push('stripe')
  if (settings.paypal.enabled && process.env.PAYPAL_CLIENT_ID) list.push('paypal')
  if (settings.cod.enabled) list.push('cod')
  return list
}
