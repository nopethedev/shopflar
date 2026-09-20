import { db } from '@/lib/db'
import { CategoryForm } from '@/components/admin/category-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function NewCategoryPage() {
  const categories = await db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, parentId: true } })
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/categories"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Category</h1>
      </div>
      <CategoryForm category={null} allCategories={categories} />
    </div>
  )
}
