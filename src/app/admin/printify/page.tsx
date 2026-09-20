import { db } from '@/lib/db'
import { printify } from '@/lib/printify/client'
import { AdminPrintifyManager } from '@/components/admin/admin-printify-manager'

export const dynamic = 'force-dynamic'

export default async function AdminPrintifyPage() {
  const shops = await db.printifyShop.findMany()
  const linkedProducts = await db.printifyProductLink.findMany({
    include: { product: { include: { images: { take: 1 } } } }
  })

  let remoteShops = []
  let connectionError = null
  if (printify.isConfigured) {
    try {
      remoteShops = await printify.listShops()
    } catch (e) {
      connectionError = e.message
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Printify Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">Sync products with your Printify account for print-on-demand fulfillment</p>
      </div>
      <AdminPrintifyManager
        isConfigured={printify.isConfigured}
        connectionError={connectionError}
        remoteShops={remoteShops}
        localShops={shops}
        linkedProducts={linkedProducts}
      />
    </div>
  )
}
