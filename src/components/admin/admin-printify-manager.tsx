'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Plug, Package } from 'lucide-react'

export function AdminPrintifyManager({ isConfigured, connectionError, remoteShops, localShops, linkedProducts }) {
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const syncShops = async () => {
    setSyncing(true)
    try {
      const r = await fetch('/api/printify/sync', { method: 'POST' })
      if (r.ok) {
        toast.success('Shops synced')
        router.refresh()
      } else {
        throw new Error('Sync failed')
      }
    } catch (e) {
      toast.error('Sync failed', e.message)
    } finally {
      setSyncing(false)
    }
  }

  const importProducts = async (shopId) => {
    setImporting(true)
    try {
      const r = await fetch(`/api/printify/products?shopId=${shopId}`, { method: 'POST' })
      const d = await r.json()
      if (r.ok) {
        toast.success('Products imported', `${d.imported || 0} products imported`)
        router.refresh()
      } else {
        throw new Error(d.error || 'Import failed')
      }
    } catch (e) {
      toast.error('Import failed', e.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Printify Connection
                {isConfigured ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertTriangle className="h-3 w-3 mr-1" /> Not configured</Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isConfigured ? 'API key detected in environment' : 'Add PRINTIFY_API_KEY to .env to enable'}
              </p>
            </div>
          </div>
          {isConfigured && (
            <Button variant="outline" size="sm" onClick={syncShops} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Shops'}
            </Button>
          )}
        </div>

        {connectionError && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <strong>Connection error:</strong> {connectionError}
          </div>
        )}

        {!isConfigured && (
          <div className="mt-3 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">To connect Printify:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Get your API key from <a href="https://printify.com/app/account/settings" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline inline-flex items-center gap-1">Printify Settings <ExternalLink className="h-3 w-3" /></a></li>
              <li>Add <code className="bg-background px-1 py-0.5 rounded">PRINTIFY_API_KEY=...</code> to your .env file</li>
              <li>Restart the server</li>
            </ol>
          </div>
        )}
      </Card>

      {/* Remote shops */}
      {isConfigured && remoteShops && remoteShops.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Your Printify Shops</h3>
          <div className="space-y-2">
            {remoteShops.map(shop => (
              <div key={shop.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                <div>
                  <p className="font-medium text-sm">{shop.title}</p>
                  <p className="text-xs text-muted-foreground">ID: {shop.id}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => importProducts(shop.id)} disabled={importing}>
                  <Package className="h-3.5 w-3.5 mr-1" />
                  Import Products
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Linked products */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Linked Products ({linkedProducts.length})</h3>
        {linkedProducts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No Printify-linked products yet. Import some to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {linkedProducts.map(link => (
              <a key={link.id} href={`/admin/products/${link.productId}`} className="flex items-center gap-3 p-3 border border-border rounded-md hover:bg-muted/30">
                <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                  {link.product.images?.[0]?.url && <img src={link.product.images[0].url} alt={link.product.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{link.product.name}</p>
                  <p className="text-xs text-muted-foreground">Printify ID: {link.printifyProductId}</p>
                </div>
                <Badge variant="outline">
                  {link.lastSyncedAt ? `Synced ${new Date(link.lastSyncedAt).toLocaleDateString()}` : 'Never synced'}
                </Badge>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
