import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminUsersManager } from '@/components/admin/admin-users-manager'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const user = await requireSuperAdmin().catch(() => null)
  if (!user) redirect('/login?next=/admin/users')

  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true, emailVerified: true }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Users & Admins</h1>
        <p className="text-sm text-muted-foreground mt-1">{users.length} users (admins and customers)</p>
      </div>
      <AdminUsersManager users={users} currentUser={user} />
    </div>
  )
}
