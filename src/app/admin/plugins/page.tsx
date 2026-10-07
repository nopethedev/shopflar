import { db } from '@/lib/db'
import { AdminPluginsManager } from '@/components/admin/admin-plugins-manager'

export const dynamic = 'force-dynamic'

// Built-in plugin definitions
const BUILTIN_PLUGINS = [
  {
    slug: 'mystery-crate',
    name: 'Mystery Crate',
    description: 'Create mystery box products that include random items from a configured pool. Customers love the surprise — and you control the odds.',
    icon: 'gift',
    configPage: '/admin/plugins/mystery-crate'
  },
  {
    slug: 'cookie-consent',
    name: 'Cookie Consent Banner',
    description: 'GDPR/CCPA-compliant cookie consent banner shown to all visitors. Stores consent in the database for audit purposes.',
    icon: 'cookie',
    configPage: null
  },
  {
    slug: 'product-reviews',
    name: 'Product Reviews',
    description: 'Let customers submit reviews on product pages. Reviews are moderated in the admin panel before going live.',
    icon: 'star',
    configPage: '/admin/reviews'
  },
  {
    slug: 'wishlist',
    name: 'Wishlist',
    description: 'Allow customers to save products to a wishlist for later. Persists across sessions via localStorage.',
    icon: 'heart',
    configPage: null
  },
  {
    slug: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Newsletter signup form on the homepage and a subscriber management panel in admin. Export subscribers to CSV.',
    icon: 'mail',
    configPage: '/admin/newsletter'
  },
  {
    slug: 'printify',
    name: 'Printify Integration',
    description: 'Connect your Printify account to sync print-on-demand products and push orders for fulfillment.',
    icon: 'plug',
    configPage: '/admin/printify'
  }
]

export default async function AdminPluginsPage() {
  // Get enabled state from DB
  const dbPlugins = await db.plugin.findMany()
  const dbMap = new Map(dbPlugins.map(p => [p.slug, p]))

  const plugins = BUILTIN_PLUGINS.map(p => ({
    ...p,
    enabled: dbMap.get(p.slug)?.enabled ?? false,
    installed: dbMap.has(p.slug)
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Plugins</h1>
        <p className="text-sm text-muted-foreground mt-1">Enable or disable features. Some plugins have configuration pages.</p>
      </div>
      <AdminPluginsManager plugins={plugins} />
    </div>
  )
}
