import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProvider } from '@/lib/payments'
import { markOrderPaid } from '@/lib/services/orders'

export async function POST(req) {
  try {
    const provider = getProvider('paypal')
    const body = await req.json()
    const eventType = body.event_type
    const resource = body.resource

    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      // Verify server-side
      const orderId = resource?.custom_id || resource?.supplementary_data?.related_ids?.order_id
      let ref = resource?.id
      if (!orderId || !ref) {
        // Try to look up by capture reference
        return NextResponse.json({ ok: true })
      }
      try {
        const verification = await provider.verifyPayment(ref)
        if (verification.success) {
          await markOrderPaid(orderId, 'paypal', ref)
        }
      } catch (e) {
        console.error('PayPal verification failed:', e)
      }
    } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      const orderId = resource?.custom_id
      if (orderId) {
        await db.order.update({
          where: { id: orderId },
          data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' }
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PayPal webhook error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
