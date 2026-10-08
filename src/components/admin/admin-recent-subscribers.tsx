import Link from 'next/link'
import { Mail, ChevronRight } from 'lucide-react'

export function AdminRecentSubscribers({ subscribers, total }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Newsletter Subscribers</h2>
        <Link href="/admin/newsletter" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center">
          View all ({total}) <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {subscribers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No subscribers yet.</p>
      ) : (
        <div className="space-y-2">
          {subscribers.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {s.email[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.email}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
