import { db } from '@/lib/db'
import { ProductEditor } from '@/components/admin/product-editor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }) {
  const { id } = await params
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { name: 'asc' } },
        categories: true,
        tags: true,
        printifyLink: true
      }
    }),
    db.category.findMany({ orderBy: { name: 'asc' } })
  ])

  if (!product) notFound()

  return (
    <div className="max-w-5xl mx-auto">
      <ProductEditor product={product} categories={categories} />
    </div>
  )
}
