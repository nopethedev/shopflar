import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { InstallWizard } from '@/components/install/install-wizard'

export const dynamic = 'force-dynamic'

export default async function InstallPage() {
  // If an admin already exists, redirect to login (install already done)
  const adminCount = await db.user.count({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
  }).catch(() => 0)

  if (adminCount > 0) {
    redirect('/login?next=/admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/30 flex items-center justify-center p-4">
      <InstallWizard />
    </div>
  )
}
