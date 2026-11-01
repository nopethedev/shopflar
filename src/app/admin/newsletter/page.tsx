import { db } from '@/lib/db'
import { getStoreSettings, getAppUrl } from '@/lib/settings'
import { AdminNewsletterManager } from '@/components/admin/admin-newsletter-manager'

export const dynamic = 'force-dynamic'

export default async function AdminNewsletterPage() {
  const [subscribers, settings, appUrl] = await Promise.all([
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } }),
    getStoreSettings(),
    getAppUrl()
  ])
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Design campaigns with the visual editor and send them to your subscribers.
        </p>
      </div>
      <AdminNewsletterManager
        subscribers={subscribers}
        store={{ name: settings.storeName, logoUrl: settings.logoUrl, url: appUrl, address: settings.storeAddress }}
      />
    </div>
  )
}
