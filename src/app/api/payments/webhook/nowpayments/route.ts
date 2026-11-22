import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { markOrderPaid } from '@/lib/services/orders'
import { verifyNowWebhook } from '@/lib/payments/crypto'

// NOWPayments IPN. Signature (HMAC-SHA512 over the key-sorted body) must match.
export async function POST(req) {
  try {
    const body = await req.json()
    if (!(await verifyNowWebhook(body, req.headers.get('x-nowpayments-sig')))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const orderId = String(body.order_id || '')
    const order = orderId ? await db.order.findUnique({ where: { id: orderId } }) : null
    if (!order) return NextResponse.json({ ok: true })

    if (body.payment_status === 'finished') {
      // Never mark paid for less than the order total (underpayment)
      const paid = Number(body.price_amount)
      if (Number.isFinite(paid) && paid + 0.01 >= order.total) {
        await markOrderPaid(order.id, 'crypto_nowpayments', String(body.payment_id || order.paymentRef || ''))
      } else {
        console.warn(`NOWPayments: order ${order.orderNumber} underpaid (${paid} < ${order.total})`)
      }
    } else if (['failed', 'expired', 'refunded'].includes(body.payment_status) && order.paymentStatus !== 'PAID') {
      await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('NOWPayments webhook error:', e)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
