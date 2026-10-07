import { db } from '@/lib/db'
import { PageEditor } from '@/components/admin/page-editor'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditPagePage({ params }) {
  const { id } = await params
  const page = await db.customPage.findUnique({ where: { id } })
  if (!page) notFound()
  return (
    <div className="max-w-4xl mx-auto">
      <PageEditor page={page} />
    </div>
  )
}
