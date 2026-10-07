import { getLegalContent } from '@/lib/settings'
import { AdminLegalEditor } from '@/components/admin/admin-legal-editor'

export const dynamic = 'force-dynamic'

export default async function AdminLegalPage() {
  const [refundPolicy, privacyPolicy, termsConditions, cookiePolicy] = await Promise.all([
    getLegalContent('refund_policy'),
    getLegalContent('privacy_policy'),
    getLegalContent('terms_and_conditions'),
    getLegalContent('cookie_policy')
  ])

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Legal Pages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Override the default policy content. Leave blank to use the built-in defaults.
          HTML is supported. Business details are pulled from <a href="/admin/business" className="text-foreground hover:underline">Business Details</a>.
        </p>
      </div>
      <AdminLegalEditor
        initial={{
          refund_policy: refundPolicy,
          privacy_policy: privacyPolicy,
          terms_and_conditions: termsConditions,
          cookie_policy: cookiePolicy
        }}
      />
    </div>
  )
}
