'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { slugify } from '@/lib/settings'
import { ArrowLeft, Save, Eye, EyeOff, Trash2 } from 'lucide-react'

export function AdminCategoriesList({ categories }) {
  const router = useRouter()
  const [editing, setEditing] = useState(null) // category id
  const [form, setForm] = useState(null)

  const top = categories.filter(c => !c.parentId)

  const editCategory = (c) => {
    setEditing(c.id)
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      imageUrl: c.imageUrl || '',
      parentId: c.parentId || '',
      isVisible: c.isVisible,
      sortOrder: c.sortOrder
    })
  }

  const save = async (id) => {
    const r = await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, slug: form.slug || slugify(form.name) })
    })
    if (r.ok) {
      toast.success('Saved')
      setEditing(null)
      router.refresh()
    } else {
      const d = await r.json()
      toast.error('Save failed', d.error)
    }
  }

  const del = async (id) => {
    if (!confirm('Delete this category? Products in this category will be unlinked.')) return
    const r = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Deleted')
      router.refresh()
    } else {
      toast.error('Delete failed')
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-3">
      {top.map(c => (
        <Card key={c.id} className="p-0 overflow-hidden">
          <div className="flex items-center gap-3 p-3 hover:bg-muted/20">
            <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
              {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">/{c.slug} · {c._count?.products || 0} products</p>
            </div>
            {c.isVisible ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <Button variant="ghost" size="sm" onClick={() => editCategory(c)}>Edit</Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(c.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Edit form */}
          {editing === c.id && form && (
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Slug</Label>
                  <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Image URL</Label>
                  <Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Sort order</Label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Visible</Label>
                  <Switch checked={form.isVisible} onCheckedChange={(v) => set('isVisible', v)} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => save(c.id)}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Children */}
          {c.children && c.children.length > 0 && (
            <div className="border-t border-border bg-muted/10">
              {c.children.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 px-3 py-2 pl-10 hover:bg-muted/20">
                  <span className="text-xs text-muted-foreground">↳</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">/{sub.slug}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => editCategory(sub)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(sub.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
