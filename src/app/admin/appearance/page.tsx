import { db } from '@/lib/db'
import { AdminAppearanceEditor } from '@/components/admin/admin-appearance-editor'

export const dynamic = 'force-dynamic'

export default async function AdminAppearancePage() {
  const settings = await db.storeSetting.findMany()
  const appearance = await db.appearanceSetting.findMany()

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Online Store</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Navigation & branding</h1>
          <p className="sf-sub mt-0.5">Fine-tune colors, typography, logo and the announcement bar. Changes apply immediately.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/themes" className="sf-btn sf-btn-secondary">Browse themes</a>
          <a href="/admin/builder" className="sf-btn sf-btn-primary">Open theme editor</a>
        </div>
      </div>
      <AdminAppearanceEditor
        settings={Object.fromEntries(settings.map(s => [s.key, s.value]))}
        appearance={Object.fromEntries(appearance.map(a => [a.key, a.value]))}
      />
    </div>
  )
}
