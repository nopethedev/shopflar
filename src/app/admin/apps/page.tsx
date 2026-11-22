import { APP_CATALOG } from '@/lib/app-catalog'
import { getAllAppStates, isAppReady, publicConfig } from '@/lib/apps'
import { AdminAppLibrary } from '@/components/admin/admin-app-library'
import { absoluteUrlFromEnv } from '@/lib/app-url'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'App Library' }

export default async function AdminAppsPage() {
  const states = await getAllAppStates()
  const apps = APP_CATALOG.map(def => {
    const s = states.get(def.slug) || { slug: def.slug, enabled: false, config: {} }
    return { ...def, enabled: s.enabled, ready: isAppReady(def, s), config: publicConfig(def, s.config) }
  })
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">App Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Payments, fulfillment, marketing, analytics and add-ons. Turn on what you need — everything runs on your own server.
        </p>
      </div>
      <AdminAppLibrary apps={apps} baseUrl={absoluteUrlFromEnv()} />
    </div>
  )
}
