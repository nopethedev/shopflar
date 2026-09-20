'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { slugify } from '@/lib/settings'
import { Save } from 'lucide-react'

export function CategoryForm({ category, allCategories }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    imageUrl: category?.imageUrl || '',
    parentId: category?.parentId || '',
    isVisible: category?.isVisible ?? true,
    sortOrder: category?.sortOrder ?? 0
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        parentId: form.parentId || null,
        sortOrder: parseInt(form.sortOrder) || 0
      }
      const url = category ? `/api/admin/categories/${category.id}` : '/api/admin/categories'
      const method = category ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed')
      toast.success('Saved')
      router.push('/admin/categories')
      router.refresh()
    } catch (e) {
      toast.error('Save failed', e.message)
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => { set('name', e.target.value); if (!category) set('slug', slugify(e.target.value)) }} />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} />
      </div>
      <div>
        <Label>Image URL</Label>
        <Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div>
        <Label>Parent category (optional)</Label>
        <Select value={form.parentId || 'none'} onValueChange={(v) => set('parentId', v === 'none' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="None (top level)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (top level)</SelectItem>
            {allCategories.filter(c => c.id !== category?.id).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
        </div>
        <div className="flex items-end justify-between pb-2">
          <Label>Visible on storefront</Label>
          <Switch checked={form.isVisible} onCheckedChange={(v) => set('isVisible', v)} />
        </div>
      </div>
      <Button onClick={save} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Category'}
      </Button>
    </Card>
  )
}
