import fs from 'node:fs'
import path from 'node:path'
import { requireSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminUpdaterManager } from '@/components/admin/admin-updater-manager'

export const dynamic = 'force-dynamic'

function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'updates', file), 'utf8')) } catch { return null }
}

export default async function AdminUpdaterPage() {
  const user = await requireSuperAdmin().catch(() => null)
  if (!user) redirect('/login?next=/admin/updater')

  let version = 'unknown'
  try { version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version } catch {}

  const lastUpdate = readJsonSafe('last-update.json')
  const state = readJsonSafe('state.json')
  const pending = readJsonSafe('pending.json')
  let pendingZip = null
  if (fs.existsSync(path.join(process.cwd(), 'updates', 'pending.zip'))) {
    pendingZip = { ...(pending || {}) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a Shopflar update package (.zip) — your data, .env and package.json customizations are preserved
        </p>
      </div>
      <AdminUpdaterManager version={version} lastUpdate={lastUpdate} initialState={state} initialPending={pendingZip} />
    </div>
  )
}
