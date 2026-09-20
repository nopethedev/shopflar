import { db } from '@/lib/db'
import { AdminAppearanceEditor } from '@/components/admin/admin-appearance-editor'

export const dynamic = 'force-dynamic'

export default async function AdminAppearancePage() {
  const settings = await db.storeSetting.findMany()
  const appearance = await db.appearanceSetting.findMany()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize the storefront look & feel — changes apply immediately</p>
      </div>
      <AdminAppearanceEditor
        settings={Object.fromEntries(settings.map(s => [s.key, s.value]))}
        appearance={Object.fromEntries(appearance.map(a => [a.key, a.value]))}
      />
    </div>
  )
}
