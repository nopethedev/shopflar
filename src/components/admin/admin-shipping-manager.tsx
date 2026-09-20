'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Save } from 'lucide-react'
import { toast } from '@/lib/toast'

export function AdminShippingManager({ methods: initialMethods }) {
  const router = useRouter()
  const [methods, setMethods] = useState(initialMethods)
  const [saving, setSaving] = useState(null)

  const update = (id, field, value) => {
    setMethods(ms => ms.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const save = async (id) => {
    setSaving(id)
    const m = methods.find(x => x.id === id)
    const r = await fetch(`/api/admin/shipping/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...m,
        price: Number(m.price) || 0,
        freeShippingThreshold: m.freeShippingThreshold ? Number(m.freeShippingThreshold) : null,
        sortOrder: parseInt(m.sortOrder) || 0
      })
    })
    if (r.ok) { toast.success('Saved'); router.refresh() }
    else toast.error('Failed')
    setSaving(null)
  }

  const del = async (id) => {
    if (!confirm('Delete this shipping method?')) return
    const r = await fetch(`/api/admin/shipping/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setMethods(methods.filter(m => m.id !== id))
      toast.success('Deleted')
    }
  }

  const addNew = async () => {
    const r = await fetch('/api/admin/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Shipping Method', price: 0, countries: 'ALL', isActive: false })
    })
    if (r.ok) {
      const d = await r.json()
      setMethods([...methods, d.method])
      toast.success('Added')
    }
  }

  return (
    <div className="space-y-3">
      {methods.map(m => (
        <Card key={m.id} className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={m.name} onChange={(e) => update(m.id, 'name', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={m.description || ''} onChange={(e) => update(m.id, 'description', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Price ($)</Label>
              <Input type="number" step="0.01" value={m.price} onChange={(e) => update(m.id, 'price', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Free shipping threshold ($)</Label>
              <Input type="number" step="0.01" value={m.freeShippingThreshold || ''} onChange={(e) => update(m.id, 'freeShippingThreshold', e.target.value)} placeholder="No free ship" />
            </div>
            <div>
              <Label className="text-xs">Estimated days</Label>
              <Input value={m.estimatedDays || ''} onChange={(e) => update(m.id, 'estimatedDays', e.target.value)} placeholder="3-5" />
            </div>
            <div>
              <Label className="text-xs">Countries</Label>
              <Input value={m.countries} onChange={(e) => update(m.id, 'countries', e.target.value)} placeholder='["US","CA"] or ALL' />
            </div>
            <div>
              <Label className="text-xs">Sort order</Label>
              <Input type="number" value={m.sortOrder} onChange={(e) => update(m.id, 'sortOrder', e.target.value)} />
            </div>
            <div className="flex items-end justify-between pb-2">
              <Label className="text-xs">Active</Label>
              <Switch checked={m.isActive} onCheckedChange={(v) => update(m.id, 'isActive', v)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save(m.id)} disabled={saving === m.id}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving === m.id ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(m.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={addNew}>
        <Plus className="h-4 w-4 mr-2" /> Add Shipping Method
      </Button>
    </div>
  )
}
