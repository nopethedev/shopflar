import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/payments'
import { markOrderPaid } from '@/lib/services/orders'

// Called after user returns from PayPal approval flow
export async function POST(req) {
  try {
    const { provider, reference, orderId } = await req.json()

    if (!orderId || !reference) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }

    // Server-side verification — never trust the client
    if (provider === 'paypal') {
      const p = getProvider('paypal')
      const result = await p.verifyPayment(reference)
      if (result.success) {
        await markOrderPaid(orderId, 'paypal', reference)
        return NextResponse.json({ ok: true, paid: true })
      } else {
        return NextResponse.json({ error: 'Payment not completed', status: result.status }, { status: 400 })
      }
    }

    if (provider === 'stripe') {
      const p = getProvider('stripe')
      const result = await p.verifyPayment(reference)
      if (result.success) {
        await markOrderPaid(orderId, 'stripe', reference)
        return NextResponse.json({ ok: true, paid: true })
      } else {
        return NextResponse.json({ error: 'Payment not completed', status: result.status }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  } catch (e) {
    console.error('Payment verify error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
