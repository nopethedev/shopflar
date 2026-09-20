import { NextResponse } from 'next/server'
import { getPaymentSettings } from '@/lib/payments'

export async function GET() {
  const settings = await getPaymentSettings()
  const providers = []

  if (settings.stripe.enabled && process.env.STRIPE_SECRET_KEY) {
    providers.push({
      id: 'stripe',
      name: 'Credit Card (Stripe)',
      description: 'Visa, Mastercard, Amex',
      testMode: settings.stripe.testMode,
      publishableKey: settings.stripe.publishableKey
    })
  }
  if (settings.paypal.enabled && process.env.PAYPAL_CLIENT_ID) {
    providers.push({
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      testMode: settings.paypal.testMode,
      clientId: settings.paypal.clientId
    })
  }
  // Always provide COD as fallback for demo
  providers.push({
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay when your order arrives',
    testMode: false
  })

  return NextResponse.json({ providers })
}
