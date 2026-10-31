import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getProvider } from '@/lib/payments'

export async function POST(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const order = await db.order.findUnique({ where: { id: params.id }, include: { payments: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const successfulPayment = order.payments.find(p => p.status === 'SUCCEEDED')
    if (!successfulPayment) {
      return NextResponse.json({ error: 'No successful payment to refund' }, { status: 400 })
    }

    if (order.paymentProvider && order.paymentProvider !== 'cod') {
      try {
        const provider = getProvider(order.paymentProvider)
        const result = await provider.refundPayment(successfulPayment.reference, order.total)
        await db.payment.create({
          data: {
            orderId: order.id,
            provider: order.paymentProvider,
            amount: -result.amount,
            status: 'REFUNDED',
            reference: result.id
          }
        })
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
    }

    await db.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' }
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
