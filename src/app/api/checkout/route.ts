import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createOrder, markOrderPaid } from '@/lib/services/orders'
import { getProvider } from '@/lib/payments'
import { getSessionUser } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'
import { z } from 'zod'

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().nullable().optional(),
    quantity: z.number().int().min(1)
  })).min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
  shippingMethodId: z.string().min(1),
  paymentProvider: z.enum(['stripe', 'paypal', 'paypal_standard', 'cod']).optional(),
  discountCode: z.string().optional(),
  notes: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional()
})

export async function POST(req) {
  try {
    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data
    const sessionUser = await getSessionUser()
    let userId = sessionUser?.id || null

    // Optionally create account
    if (data.createAccount && !userId && data.password && data.password.length >= 8) {
      const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase().trim() } })
      if (!existing) {
        const newUser = await db.user.create({
          data: {
            email: data.email.toLowerCase().trim(),
            passwordHash: hashPassword(data.password),
            name: `${data.firstName} ${data.lastName}`,
            role: 'CUSTOMER',
            emailVerified: new Date(),
            profile: { create: { firstName: data.firstName, lastName: data.lastName } }
          }
        })
        await createSession(newUser)
        userId = newUser.id
      }
    }

    const shippingAddress = {
      firstName: data.firstName,
      lastName: data.lastName,
      address1: data.address1,
      address2: data.address2 || null,
      city: data.city,
      state: data.state || null,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone || null
    }

    const provider = data.paymentProvider || 'cod'
    const order = await createOrder({
      items: data.items,
      discountCode: data.discountCode,
      shippingMethodId: data.shippingMethodId,
      customer: { email: data.email, userId },
      shippingAddress,
      paymentProvider: provider
    })

    if (order.notes != null) {
      await db.order.update({ where: { id: order.id }, data: { notes: data.notes || null } })
    }

    // For COD, mark as paid immediately (in production you'd wait for actual payment)
    if (provider === 'cod') {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'PENDING', paymentStatus: 'UNPAID' }
      })
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: 'cod'
      })
    }

    // For Stripe, create payment intent
    if (provider === 'stripe') {
      try {
        const stripe = getProvider('stripe')
        const intent = await stripe.createPaymentIntent({
          amount: order.total,
          currency: order.currency,
          orderId: order.id,
          metadata: { orderNumber: order.orderNumber, email: order.email }
        })
        await db.order.update({
          where: { id: order.id },
          data: { paymentRef: intent.id }
        })
        return NextResponse.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider: 'stripe',
          clientSecret: intent.clientSecret,
          paymentIntentId: intent.id
        })
      } catch (e) {
        await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
        return NextResponse.json({ error: e.message || 'Stripe error' }, { status: 400 })
      }
    }

    // For PayPal, create PayPal order and return approval URL
    if (provider === 'paypal') {
      try {
        const paypal = getProvider('paypal')
        const result = await paypal.createPaymentIntent({
          amount: order.total,
          currency: order.currency,
          description: `Order ${order.orderNumber}`,
          orderId: order.id
        })
        await db.order.update({
          where: { id: order.id },
          data: { paymentRef: result.id }
        })
        const approveLink = result.links?.find(l => l.rel === 'approve')
        if (!approveLink) {
          return NextResponse.json({ error: 'PayPal approval link missing' }, { status: 500 })
        }
        // Append our orderId so the return URL can look it up
        const url = new URL(approveLink.href)
        url.searchParams.set('shopflarOrderId', order.id)
        return NextResponse.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider: 'paypal',
          redirect: url.toString()
        })
      } catch (e) {
        await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
        return NextResponse.json({ error: e.message || 'PayPal error' }, { status: 400 })
      }
    }

    // For PayPal Standard (personal account, IPN-only), redirect to PayPal's
    // hosted checkout page. The user pays on paypal.com, then PayPal sends an
    // IPN to /api/payments/webhook/paypal/ipn which verifies the payment.
    if (provider === 'paypal_standard') {
      try {
        const paypal = getProvider('paypal_standard')
        const result = await paypal.createPaymentIntent({
          amount: order.total,
          currency: order.currency,
          description: `Order ${order.orderNumber}`,
          orderId: order.id
        })
        await db.order.update({
          where: { id: order.id },
          data: { paymentRef: result.id, paymentProvider: 'paypal_standard' }
        })
        return NextResponse.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider: 'paypal_standard',
          redirect: result.redirect
        })
      } catch (e) {
        await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } })
        return NextResponse.json({ error: e.message || 'PayPal error' }, { status: 400 })
      }
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber })
  } catch (e) {
    console.error('Checkout error:', e)
    return NextResponse.json(
      { error: e.message || 'Checkout failed. Please try again.' },
      { status: 400 }
    )
  }
}
