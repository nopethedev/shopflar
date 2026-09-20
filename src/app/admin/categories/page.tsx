import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft } from 'lucide-react'
import { AdminCategoriesList } from '@/components/admin/admin-categories-list'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      children: true,
      _count: { select: { products: true } }
    }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories</p>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new"><Plus className="h-4 w-4 mr-2" /> New Category</Link>
        </Button>
      </div>

      <AdminCategoriesList categories={categories} />
    </div>
  )
}
