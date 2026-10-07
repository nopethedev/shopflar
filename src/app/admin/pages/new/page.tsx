import { PageEditor } from '@/components/admin/page-editor'

export const dynamic = 'force-dynamic'

export default async function NewPagePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageEditor page={null} />
    </div>
  )
}
