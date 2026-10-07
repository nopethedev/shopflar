import { db } from '@/lib/db'
import { AdminReviewsManager } from '@/components/admin/admin-reviews-manager'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const reviews = await db.productReview.findMany({
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { name: true, slug: true, id: true } } }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Moderate customer reviews and add your own</p>
      </div>
      <AdminReviewsManager initialReviews={reviews} />
    </div>
  )
}
