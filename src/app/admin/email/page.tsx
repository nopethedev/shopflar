import { db } from '@/lib/db'
import { AdminEmailConfig } from '@/components/admin/admin-email-config'
import { isEmailConfigured } from '@/lib/email'

export const dynamic = 'force-dynamic'

export default async function AdminEmailPage() {
  const [rows, configured] = await Promise.all([
    db.storeSetting.findMany({ where: { key: { startsWith: 'smtp_' } } }),
    isEmailConfigured()
  ])
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))

  // Also load newsletter welcome config
  const welcomeRows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'newsletter_welcome_' } }
  })
  const welcome = Object.fromEntries(welcomeRows.map(r => [r.key, r.value]))

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Email &amp; SMTP</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure SMTP for order confirmations, newsletter emails, and welcome discount codes.
          {!configured && <span className="text-amber-600 font-medium"> — SMTP not configured yet.</span>}
          {configured && <span className="text-emerald-600 font-medium"> — SMTP is configured.</span>}
        </p>
      </div>
      <AdminEmailConfig settings={settings} welcome={welcome} configured={configured} />
    </div>
  )
}
