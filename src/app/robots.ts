import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getAppUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/checkout', '/cart', '/api/']
    },
    sitemap: `${baseUrl}/sitemap.xml`
  }
}
