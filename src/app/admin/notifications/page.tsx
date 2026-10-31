import { db } from '@/lib/db'
import { getDiscordConfig } from '@/lib/discord'
import { AdminNotificationsManager } from '@/components/admin/admin-notifications-manager'

export const dynamic = 'force-dynamic'

export default async function AdminNotificationsPage() {
  const config = await getDiscordConfig()
  const configured = !!(config.enabled && config.webhookUrl)

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get notified on Discord when something happens in your store — new orders,
          payments, refunds, low stock, failed emails and more.
          {configured && <span className="text-emerald-600 font-medium"> — Discord notifications are active.</span>}
        </p>
      </div>
      <AdminNotificationsManager
        initialEnabled={config.enabled}
        initialWebhookUrl={config.webhookUrl}
        initialEvents={config.events}
      />
    </div>
  )
}
