import { db } from '@/lib/db'
import Link from 'next/link'
import { AdminProductsTable } from '@/components/admin/admin-products-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage({ searchParams }) {
  const sp = await searchParams
  const page = parseInt(sp.page || '1')
  const limit = 25
  const search = sp.search || ''

  const where = search ? {
    OR: [
      { name: { contains: search } },
      { slug: { contains: search } },
      { sku: { contains: search } }
    ]
  } : {}

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        variants: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    db.product.count({ where })
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} product{total !== 1 ? 's' : ''} in catalog</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new"><Plus className="h-4 w-4 mr-2" /> New Product</Link>
        </Button>
      </div>

      <AdminProductsTable products={products} total={total} page={page} limit={limit} search={search} />
    </div>
  )
}
