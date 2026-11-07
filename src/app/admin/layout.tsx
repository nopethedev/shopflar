import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }) {
  // Check if any admin user exists. If not, redirect to /install
  const adminCount = await db.user.count({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
  }).catch(() => 0)

  if (adminCount === 0) {
    redirect('/install')
  }

  const user = await getSessionUser()
  if (!user) redirect('/login?next=/admin')
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') redirect('/')

  const settings = await db.storeSetting.findMany()
  const settingsMap = new Map(settings.map(s => [s.key, s.value]))
  const storeName = settingsMap.get('store_name') || 'Shopflar'

  return (
    <div className="admin-shell min-h-screen bg-[#f1f1f1] text-[#303030]">
      <div className="flex items-stretch">
        <AdminSidebar user={user} storeName={storeName} />
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <AdminHeader user={user} storeName={storeName} />
          <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
