// Crypto payment providers — Coinbase Commerce, NOWPayments and plain wallet
// transfers. Settings come from the App Library (Admin → App Library).
//
// Security notes:
//  • Orders are only ever marked paid from a signature-verified webhook, or by
//    re-fetching the charge/payment from the provider's API. Nothing the
//    browser sends is trusted.
//  • Amounts are checked against the order total before marking it paid.
import crypto from 'node:crypto'
import { getReadyApp } from '@/lib/apps'

export class CryptoError extends Error {
  code: string
  constructor(message: string, code = 'CRYPTO_ERROR') { super(message); this.code = code }
}

function timingSafeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, 'hex'), bb = Buffer.from(b, 'hex')
  return ab.length === bb.length && ab.length > 0 && crypto.timingSafeEqual(ab, bb)
}

// ───────────── Coinbase Commerce ─────────────
const CC_API = 'https://api.commerce.coinbase.com'

export async function coinbaseConfig() {
  const app = await getReadyApp('crypto-coinbase')
  return app ? app.config : null
}

export async function createCoinbaseCharge({ amount, currency, orderId, orderNumber, redirectUrl, cancelUrl }) {
  const cfg = await coinbaseConfig()
  if (!cfg) throw new CryptoError('Coinbase Commerce is not configured', 'NOT_CONFIGURED')
  const res = await fetch(`${CC_API}/charges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CC-Api-Key': cfg.apiKey, 'X-CC-Version': '2018-03-22' },
    body: JSON.stringify({
      name: `Order ${orderNumber}`,
      description: `Payment for order ${orderNumber}`,
      pricing_type: 'fixed_price',
      local_price: { amount: Number(amount).toFixed(2), currency: String(currency || 'USD').toUpperCase() },
      metadata: { orderId, orderNumber },
      redirect_url: redirectUrl,
      cancel_url: cancelUrl
    })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new CryptoError(data?.error?.message || 'Coinbase Commerce rejected the charge', 'COINBASE_CREATE_FAILED')
  return { id: data.data.code as string, url: data.data.hosted_url as string }
}

export async function fetchCoinbaseCharge(code: string) {
  const cfg = await coinbaseConfig()
  if (!cfg) throw new CryptoError('Coinbase Commerce is not configured', 'NOT_CONFIGURED')
  const res = await fetch(`${CC_API}/charges/${encodeURIComponent(code)}`, {
    headers: { 'X-CC-Api-Key': cfg.apiKey, 'X-CC-Version': '2018-03-22' }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new CryptoError('Could not verify the charge with Coinbase', 'COINBASE_VERIFY_FAILED')
  const charge = data.data
  const statuses: string[] = (charge.timeline || []).map((t: any) => t.status)
  return {
    success: statuses.includes('COMPLETED') || statuses.includes('RESOLVED'),
    status: statuses[statuses.length - 1] || 'NEW',
    orderId: charge.metadata?.orderId as string | undefined,
    charge
  }
}

/** Verifies X-CC-Webhook-Signature (HMAC-SHA256 of the raw body). */
export async function verifyCoinbaseWebhook(rawBody: string, signature: string | null) {
  const cfg = await coinbaseConfig()
  if (!cfg || !signature) return false
  const expected = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody, 'utf8').digest('hex')
  return timingSafeEqualHex(expected, signature)
}

// ───────────── NOWPayments ─────────────
export async function nowConfig() {
  const app = await getReadyApp('crypto-nowpayments')
  return app ? app.config : null
}
const nowBase = (cfg: any) => cfg.sandbox ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1'

export async function createNowInvoice({ amount, currency, orderId, orderNumber, ipnUrl, successUrl, cancelUrl }) {
  const cfg = await nowConfig()
  if (!cfg) throw new CryptoError('NOWPayments is not configured', 'NOT_CONFIGURED')
  const res = await fetch(`${nowBase(cfg)}/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey },
    body: JSON.stringify({
      price_amount: Number(Number(amount).toFixed(2)),
      price_currency: String(currency || 'USD').toLowerCase(),
      order_id: orderId,
      order_description: `Order ${orderNumber}`,
      ipn_callback_url: ipnUrl,
      success_url: successUrl,
      cancel_url: cancelUrl
    })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.invoice_url) throw new CryptoError(data?.message || 'NOWPayments rejected the invoice', 'NOW_CREATE_FAILED')
  return { id: String(data.id), url: data.invoice_url as string }
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, k) => { acc[k] = sortKeys(value[k]); return acc }, {} as any)
  }
  return value
}

/** Verifies x-nowpayments-sig (HMAC-SHA512 of the key-sorted JSON body). */
export async function verifyNowWebhook(body: any, signature: string | null) {
  const cfg = await nowConfig()
  if (!cfg || !signature) return false
  const expected = crypto.createHmac('sha512', cfg.ipnSecret).update(JSON.stringify(sortKeys(body))).digest('hex')
  return timingSafeEqualHex(expected, signature)
}

// ───────────── Wallet transfer ─────────────
export type Wallet = { coin: string; network: string; address: string }

export async function manualCryptoConfig() {
  const app = await getReadyApp('crypto-manual')
  if (!app) return null
  const wallets: Wallet[] = String(app.config.wallets || '')
    .split('\n')
    .map(l => l.split('|').map(p => p.trim()))
    .filter(p => p.length >= 3 && p[0] && p[2])
    .map(([coin, network, address]) => ({ coin, network, address }))
  if (!wallets.length) return null
  return { wallets, instructions: String(app.config.instructions || '') }
}

// ───────────── Public checkout labels ─────────────
export async function cryptoCheckoutOptions() {
  const [cb, now, manual] = await Promise.all([coinbaseConfig(), nowConfig(), manualCryptoConfig()])
  const out: { id: string; name: string; description: string }[] = []
  if (cb) out.push({ id: 'crypto_coinbase', name: cb.label || 'Pay with crypto', description: 'BTC, ETH, USDC and more — Coinbase Commerce' })
  if (now) out.push({ id: 'crypto_nowpayments', name: now.label || 'Pay with crypto', description: '300+ cryptocurrencies — NOWPayments' })
  if (manual) out.push({ id: 'crypto_manual', name: (await getReadyApp('crypto-manual'))?.config.label || 'Crypto (wallet transfer)', description: 'Send directly to our wallet' })
  return out
}
