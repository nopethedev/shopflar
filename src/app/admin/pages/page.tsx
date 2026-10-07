import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import { AdminPagesList } from '@/components/admin/admin-pages-list'

export const dynamic = 'force-dynamic'

export default async function AdminPagesPage() {
  const pages = await db.customPage.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Custom Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">{pages.length} page{pages.length !== 1 ? 's' : ''} — build landing pages, about sections, lookbooks, and more</p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new"><Plus className="h-4 w-4 mr-2" /> New Page</Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-semibold">No custom pages yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Create landing pages, lookbooks, size guides, or any custom content. Pages can be linked in your navigation menu.
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/pages/new"><Plus className="h-4 w-4 mr-2" /> Create your first page</Link>
          </Button>
        </div>
      ) : (
        <AdminPagesList pages={pages} />
      )}
    </div>
  )
}
