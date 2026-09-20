'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreHorizontal, Pencil, Copy, Trash2, Eye, EyeOff, Search } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { toast } from '@/lib/toast'
import { useState as useReactState } from 'react'

export function AdminProductsTable({ products, total, page, limit, search: initialSearch }) {
  const router = useRouter()
  const [search, setSearch] = useReactState(initialSearch)
  const [selected, setSelected] = useState([])
  const [deleting, setDeleting] = useState(null)

  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter(s => s !== id))
    else setSelected([...selected, id])
  }

  const toggleAll = () => {
    if (selected.length === products.length) setSelected([])
    else setSelected(products.map(p => p.id))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    router.push(`/admin/products?search=${encodeURIComponent(search)}`)
  }

  const handleAction = async (action, product) => {
    if (action === 'delete') {
      if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
      setDeleting(product.id)
      const r = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
      if (r.ok) {
        toast.success('Product deleted')
        router.refresh()
      } else {
        toast.error('Delete failed')
      }
      setDeleting(null)
    } else if (action === 'duplicate') {
      const r = await fetch(`/api/admin/products/${product.id}/duplicate`, { method: 'POST' })
      if (r.ok) {
        toast.success('Product duplicated')
        router.refresh()
      } else {
        toast.error('Duplicate failed')
      }
    } else if (action === 'toggle') {
      const newStatus = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      const r = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (r.ok) {
        toast.success(`Product ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'}`)
        router.refresh()
      }
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {selected.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-md">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              for (const id of selected) {
                await fetch(`/api/admin/products/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'DRAFT' })
                })
              }
              setSelected([])
              toast.success('Updated')
              router.refresh()
            }}>Unpublish</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              if (!confirm(`Delete ${selected.length} products?`)) return
              for (const id of selected) {
                await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
              }
              setSelected([])
              toast.success('Deleted')
              router.refresh()
            }}>Delete</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selected.length === products.length && products.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map(p => (
                <TableRow key={p.id}>
                  <TableCell><Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} /></TableCell>
                  <TableCell>
                    <Link href={`/admin/products/${p.id}`}>
                      <div className="h-12 w-10 rounded bg-muted overflow-hidden">
                        {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" />}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <p className="text-xs text-muted-foreground">{p.sku || '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                    {p.featured && <Badge variant="outline" className="ml-1">★</Badge>}
                  </TableCell>
                  <TableCell>
                    <span className={p.inventoryQty <= (p.lowStockThreshold || 5) ? 'text-amber-600 font-medium' : p.isOutOfStock ? 'text-rose-600 font-medium' : ''}>
                      {p.inventoryQty}
                    </span>
                    {p.variants?.length > 0 && <span className="text-xs text-muted-foreground"> ({p.variants.length} var)</span>}
                  </TableCell>
                  <TableCell className="font-medium">${p.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {p.categories?.slice(0, 2).map(pc => (
                        <Badge key={pc.category.id} variant="outline" className="text-[10px]">{pc.category.name}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted" disabled={deleting === p.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${p.id}`}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('toggle', p)}>
                          {p.status === 'PUBLISHED' ? <><EyeOff className="h-3.5 w-3.5 mr-2" /> Unpublish</> : <><Eye className="h-3.5 w-3.5 mr-2" /> Publish</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('duplicate', p)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${p.slug}`} target="_blank"><Eye className="h-3.5 w-3.5 mr-2" /> View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleAction('delete', p)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => router.push(`/admin/products?page=${page - 1}${search ? `&search=${search}` : ''}`)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / limit)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => router.push(`/admin/products?page=${page + 1}${search ? `&search=${search}` : ''}`)}>Next</Button>
        </div>
      )}
    </div>
  )
}
