import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'

export function AdminLowStock({ products }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Low Stock
        </h2>
        <Link href="/admin/products" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {products.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">All products well stocked.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {products.map(p => (
            <Link
              key={p.id}
              href={`/admin/products/${p.id}`}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30 -mx-2 px-2 rounded-md"
            >
              <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />}
              </div>
              <p className="text-sm font-medium flex-1 min-w-0 truncate">{p.name}</p>
              <span className={`text-sm font-semibold ${p.inventoryQty <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                {p.inventoryQty} left
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
