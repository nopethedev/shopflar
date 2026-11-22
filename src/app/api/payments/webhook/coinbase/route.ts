import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { markOrderPaid } from '@/lib/services/orders'
import { fetchCoinbaseCharge, verifyCoinbaseWebhook } from '@/lib/payments/crypto'

// Coinbase Commerce webhook. The signature is verified, then the charge is
// re-fetched from Coinbase so the payload itself is never trusted.
export async function POST(req) {
  try {
    const raw = await req.text()
    if (!(await verifyCoinbaseWebhook(raw, req.headers.get('x-cc-webhook-signature')))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const event = JSON.parse(raw)?.event
    const code = event?.data?.code
    const type: string = event?.type || ''
    if (code && (type === 'charge:confirmed' || type === 'charge:resolved')) {
      const verified = await fetchCoinbaseCharge(code)
      if (verified.success && verified.orderId) {
        const order = await db.order.findUnique({ where: { id: verified.orderId } })
        // Charge must be the one we created for this order
        if (order && order.paymentRef === code) await markOrderPaid(order.id, 'crypto_coinbase', code)
      }
    } else if (code && type === 'charge:failed') {
      const order = await db.order.findFirst({ where: { paymentRef: code, paymentStatus: { not: 'PAID' } } })
      if (order) await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Coinbase webhook error:', e)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
