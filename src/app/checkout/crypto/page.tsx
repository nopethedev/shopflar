import { db } from '@/lib/db'
import { getStoreSettings } from '@/lib/settings'
import { manualCryptoConfig } from '@/lib/payments/crypto'
import { StorefrontLayout } from '@/components/storefront/storefront-layout'
import { CopyCodeButton } from '@/components/storefront/section-client'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pay with crypto' }

export default async function CryptoPayPage({ searchParams }) {
  const sp = await searchParams
  const order = sp.order ? await db.order.findUnique({ where: { id: String(sp.order) } }).catch(() => null) : null
  const cfg = await manualCryptoConfig()
  if (!order || order.paymentProvider !== 'crypto_manual' || !cfg) notFound()

  const [settings, categories] = await Promise.all([getStoreSettings(), db.category.findMany({ where: { isVisible: true } })])
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(order.total)

  return (
    <StorefrontLayout settings={settings} categories={categories}>
      <div className="container-ecom py-12 md:py-16 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>Complete your crypto payment</h1>
        <p className="mt-2 text-muted-foreground">
          Order <span className="font-semibold text-foreground">{order.orderNumber}</span> is reserved. Send the equivalent of{' '}
          <span className="font-semibold text-foreground">{fmt}</span> to one of the wallets below.
        </p>

        {order.paymentStatus === 'PAID' && (
          <p className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3">Payment received — thank you!</p>
        )}

        <ul className="mt-6 space-y-3">
          {cfg.wallets.map((w, i) => (
            <li key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{w.coin} <span className="text-xs font-normal text-muted-foreground">{w.network}</span></p>
                <CopyCodeButton code={w.address} />
              </div>
              <p className="mt-2 font-mono text-xs break-all text-muted-foreground">{w.address}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
          <p>{cfg.instructions || 'Include your order number in the transaction memo if your wallet supports it.'}</p>
          <p>Your order ships once the transaction is confirmed. We’ll email you at <span className="text-foreground">{order.email}</span>.</p>
        </div>

        <div className="mt-8 flex gap-3">
          <Link href={`/checkout/success?order=${order.id}`} className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background">I’ve sent the payment</Link>
          <Link href="/" className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium">Back to store</Link>
        </div>
      </div>
    </StorefrontLayout>
  )
}
