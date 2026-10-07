'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { toast } from '@/lib/toast'

export function AdminPagesList({ pages: initialPages }) {
  const router = useRouter()
  const [pages, setPages] = useState(initialPages)

  const toggleNav = async (id, current) => {
    const r = await fetch(`/api/admin/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showInNav: !current })
    })
    if (r.ok) {
      setPages(pages.map(p => p.id === id ? { ...p, showInNav: !current } : p))
      toast.success(!current ? 'Added to navigation' : 'Removed from navigation')
      router.refresh()
    }
  }

  const toggleStatus = async (id, current) => {
    const newStatus = current === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    const r = await fetch(`/api/admin/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (r.ok) {
      setPages(pages.map(p => p.id === id ? { ...p, status: newStatus } : p))
      toast.success(`Page ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'}`)
      router.refresh()
    }
  }

  const del = async (id) => {
    if (!confirm('Delete this page? This cannot be undone.')) return
    const r = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setPages(pages.filter(p => p.id !== id))
      toast.success('Deleted')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left p-3 font-medium">Title</th>
            <th className="text-left p-3 font-medium">Slug</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">In Nav</th>
            <th className="text-left p-3 font-medium">Updated</th>
            <th className="w-10 p-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pages.map(p => (
            <tr key={p.id}>
              <td className="p-3">
                <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.excerpt}</p>}
              </td>
              <td className="p-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">/{p.slug}</code></td>
              <td className="p-3">
                <Badge variant={p.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                  {p.status}
                </Badge>
              </td>
              <td className="p-3">
                <Switch
                  checked={p.showInNav}
                  onCheckedChange={() => toggleNav(p.id, p.showInNav)}
                  aria-label="Toggle navigation visibility"
                />
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {new Date(p.updatedAt).toLocaleDateString()}
              </td>
              <td className="p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted" aria-label="Page actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/pages/${p.id}`}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus(p.id, p.status)}>
                      {p.status === 'PUBLISHED' ? <><EyeOff className="h-3.5 w-3.5 mr-2" /> Unpublish</> : <><Eye className="h-3.5 w-3.5 mr-2" /> Publish</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/pages/${p.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-2" /> View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => del(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
