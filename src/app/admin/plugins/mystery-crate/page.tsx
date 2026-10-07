import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { MysteryCrateEditor } from '@/components/admin/mystery-crate-editor'

export const dynamic = 'force-dynamic'

export default async function MysteryCratePage() {
  const products = await db.product.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, name: true, slug: true, price: true, sku: true },
    orderBy: { name: 'asc' }
  })

  const crates = await db.mysteryCrate.findMany({
    include: { product: { select: { name: true, slug: true, id: true, price: true } } }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mystery Crate Plugin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Turn any product into a mystery crate. When a customer buys one, it includes guaranteed items plus random picks from your pool.
        </p>
      </div>
      <MysteryCrateEditor products={products} initialCrates={crates} />
    </div>
  )
}
