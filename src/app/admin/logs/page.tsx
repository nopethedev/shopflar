import { AdminLogsView } from '@/components/admin/admin-logs-view'

export const dynamic = 'force-dynamic'

export default function AdminLogsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything happening in your store: emails sent (and why they failed),
          orders, payments, stock alerts, admin changes and webhook deliveries.
        </p>
      </div>
      <AdminLogsView />
    </div>
  )
}
