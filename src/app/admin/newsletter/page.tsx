import { db } from '@/lib/db'
import { AdminNewsletterManager } from '@/components/admin/admin-newsletter-manager'

export const dynamic = 'force-dynamic'

export default async function AdminNewsletterPage() {
  const subscribers = await db.newsletterSubscriber.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-1">{subscribers.length} subscribers</p>
      </div>
      <AdminNewsletterManager subscribers={subscribers} />
    </div>
  )
}
