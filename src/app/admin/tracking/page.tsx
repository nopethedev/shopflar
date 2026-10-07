import { db } from '@/lib/db'
import { AdminTrackingManager } from '@/components/admin/admin-tracking-manager'

export const dynamic = 'force-dynamic'

export default async function AdminTrackingPage() {
  const rows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'tracking_' } }
  })
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tracking &amp; Embeds</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Optional third-party tracking and embeds. All disabled by default — only enable what you need.
          Customers can opt out via the cookie consent banner.
        </p>
      </div>
      <AdminTrackingManager settings={settings} />
    </div>
  )
}
