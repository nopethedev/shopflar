import { db } from '@/lib/db'
import { ProductEditor } from '@/components/admin/product-editor'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="max-w-5xl mx-auto">
      <ProductEditor product={null} categories={categories} />
    </div>
  )
}
