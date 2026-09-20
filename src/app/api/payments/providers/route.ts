import { NextResponse } from 'next/server'
import { getPaymentSettings, getAvailableProviders } from '@/lib/payments'

export async function GET() {
  const settings = await getPaymentSettings()
  const available = await getAvailableProviders()
  const providers = []

  if (available.includes('stripe')) {
    providers.push({
      id: 'stripe',
      name: 'Credit Card (Stripe)',
      description: 'Visa, Mastercard, Amex',
      testMode: settings.stripe.testMode,
      publishableKey: settings.stripe.publishableKey
    })
  }
  if (available.includes('paypal')) {
    providers.push({
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      testMode: settings.paypal.testMode,
      clientId: settings.paypal.clientId
    })
  }
  // Always provide COD as fallback
  providers.push({
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay when your order arrives',
    testMode: false
  })

  return NextResponse.json({ providers })
}
