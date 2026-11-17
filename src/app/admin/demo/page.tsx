import { demoGuard, getDemoStatus, isDemoMode } from '@/lib/demo'
import { DemoPanel } from '@/components/admin/demo-panel'

export const dynamic = 'force-dynamic'

export default async function AdminDemoPage() {
  if (isDemoMode()) await demoGuard()
  const status = await getDemoStatus()
  return <DemoPanel status={status} />
}
