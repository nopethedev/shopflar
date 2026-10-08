import { db } from '@/lib/db'
import { getStoreMode, getSaleLimitStatus } from '@/lib/settings'
import { AdminStoreMode } from '@/components/admin/admin-store-mode'

export const dynamic = 'force-dynamic'

export default async function AdminStoreModePage() {
  const [settings, storeMode, saleLimit] = await Promise.all([
    db.storeSetting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'maintenance_' } },
          { key: { startsWith: 'prelaunch_' } },
          { key: { startsWith: 'sale_limit_' } }
        ]
      }
    }),
    getStoreMode(),
    getSaleLimitStatus()
  ])

  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Store Mode</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control when your store is open, in maintenance, or in pre-launch countdown mode.
        </p>
      </div>
      <AdminStoreMode settings={settingsMap} storeMode={storeMode} saleLimit={saleLimit} />
    </div>
  )
}
