import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }) {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/admin')
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') redirect('/')

  const settings = await db.storeSetting.findMany()
  const settingsMap = new Map(settings.map(s => [s.key, s.value]))
  const storeName = settingsMap.get('store_name') || 'Shopflar'

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader user={user} storeName={storeName} />
      <div className="flex">
        <AdminSidebar user={user} />
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
