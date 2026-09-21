// PayPal IPN (Instant Payment Notification) listener
// Used for personal/business PayPal accounts that don't have access to the new
// Webhooks API. Works alongside the REST-based webhook handler.
//
// PayPal sends a POST to this endpoint when a payment event occurs.
// We verify the message by sending it back to PayPal with cmd=_notify-validate
// prepended. If PayPal responds with "VERIFIED", the notification is authentic.
//
// Configure IPN URL in your PayPal account:
//   https://www.paypal.com/cgi-bin/customerprofileweb?cmd=_profile-ipn-notify
// Or pass it via the notify_url field when creating the payment (handled automatically).
//
// For personal accounts: just enter your PayPal email in Admin → Payments →
// PayPal Standard. No API credentials needed.

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProvider, getCredential } from '@/lib/payments'
import { markOrderPaid } from '@/lib/services/orders'

export async function POST(req) {
  try {
    // PayPal sends form-encoded data
    const body = await req.text()

    const paypal = getProvider('paypal')
    const isVerified = await paypal.verifyIpn(body)

    if (!isVerified) {
      console.warn('[PayPal IPN] Verification failed — ignoring notification')
      return NextResponse.json({ status: 'INVALID' }, { status: 400 })
    }

    // Parse the IPN message
    const params = new URLSearchParams(body)
    const ipnData = Object.fromEntries(params.entries())

    const txnType = ipnData.txn_type
    const paymentStatus = ipnData.payment_status
    const txnId = ipnData.txn_id
    const receiverEmail = (ipnData.receiver_email || '').toLowerCase()
    const payerEmail = ipnData.payer_email
    const customField = ipnData.custom  // we put orderId here
    const invoice = ipnData.invoice      // alternative: orderId in invoice
    const mcGross = parseFloat(ipnData.mc_gross || '0')
    const mcCurrency = ipnData.mc_currency || 'USD'

    // Optional security: verify receiver email matches the configured PayPal email
    const expectedEmail = (await getCredential('PAYPAL_EMAIL') || '').toLowerCase()
    if (expectedEmail && receiverEmail && receiverEmail !== expectedEmail) {
      console.warn(`[PayPal IPN] Receiver email mismatch: expected=${expectedEmail} got=${receiverEmail}`)
      return NextResponse.json({ status: 'RECEIVER_MISMATCH' }, { status: 400 })
    }

    // Look up our internal order ID — check custom, invoice, and finally txn_id reference
    let orderId = customField || invoice
    if (!orderId) {
      const order = await db.order.findFirst({ where: { paymentRef: txnId } })
      if (order) orderId = order.id
    }
    // If we still don't have it but we have invoice that looks like our orderNumber
    if (!orderId && invoice) {
      const order = await db.order.findUnique({ where: { orderNumber: invoice } })
      if (order) orderId = order.id
    }

    console.log(`[PayPal IPN] txn=${txnType} status=${paymentStatus} txnId=${txnId} orderId=${orderId} amount=${mcGross} ${mcCurrency} receiver=${receiverEmail}`)

    if (!orderId) {
      console.warn(`[PayPal IPN] Could not resolve order for txn_id=${txnId}`)
      return NextResponse.json({ status: 'NO_ORDER' })
    }

    if (paymentStatus === 'Completed') {
      // Mark the order as paid (server-side verified)
      await markOrderPaid(orderId, 'paypal', txnId)
    } else if (paymentStatus === 'Refunded' || paymentStatus === 'Reversed') {
      await db.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' }
      }).catch(() => {})
      await db.payment.create({
        data: {
          orderId,
          provider: 'paypal',
          amount: -mcGross,
          status: 'REFUNDED',
          reference: txnId
        }
      }).catch(() => {})
    } else if (paymentStatus === 'Pending') {
      await db.order.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_PENDING', paymentStatus: 'UNPAID' }
      }).catch(() => {})
    } else if (paymentStatus === 'Failed' || paymentStatus === 'Denied' || paymentStatus === 'Expired') {
      await db.order.update({
        where: { id: orderId },
        data: { status: 'FAILED', paymentStatus: 'UNPAID' }
      }).catch(() => {})
    }

    console.log(`[PayPal IPN] Processed: order=${orderId} status=${paymentStatus}`)

    return NextResponse.json({ status: 'OK' })
  } catch (e) {
    console.error('[PayPal IPN] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PayPal sometimes sends GET requests to verify the endpoint exists
export async function GET() {
  return NextResponse.json({ status: 'IPN listener active' })
}
