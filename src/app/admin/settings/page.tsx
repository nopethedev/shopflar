import { db } from '@/lib/db'
import { isEmailConfigured } from '@/lib/email'
import { AdminSystemSettings } from '@/components/admin/admin-system-settings'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await db.storeSetting.findMany()
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))
  const smtpConfigured = await isEmailConfigured().catch(() => false)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">General store configuration</p>
      </div>
      <AdminSystemSettings settings={settingsMap} smtpConfigured={smtpConfigured} />
    </div>
  )
}
