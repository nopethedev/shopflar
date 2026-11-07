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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Marketing</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Campaigns</h1>
          <p className="sf-sub mt-0.5">Design, send and track email campaigns to your subscribers.</p>
        </div>
      </div>
      <AdminNewsletterManager
        subscribers={subscribers}
        store={{ name: settings.storeName, logoUrl: settings.logoUrl, url: appUrl, address: settings.storeAddress }}
      />
    </div>
  )
}
