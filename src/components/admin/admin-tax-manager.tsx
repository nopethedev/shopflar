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

export function AdminTaxManager({ rates: initialRates }) {
  const router = useRouter()
  const [rates, setRates] = useState(initialRates)
  const [saving, setSaving] = useState(null)

  const update = (id, field, value) => {
    setRates(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const save = async (id) => {
    setSaving(id)
    const r = rates.find(x => x.id === id)
    const res = await fetch(`/api/admin/tax/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...r, rate: Number(r.rate) || 0 })
    })
    if (res.ok) { toast.success('Saved'); router.refresh() }
    else toast.error('Failed')
    setSaving(null)
  }

  const del = async (id) => {
    if (!confirm('Delete this tax rate?')) return
    const r = await fetch(`/api/admin/tax/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setRates(rates.filter(r => r.id !== id))
      toast.success('Deleted')
    }
  }

  const addNew = async () => {
    const r = await fetch('/api/admin/tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'US', region: '', rate: 0, name: 'New Tax Rate' })
    })
    if (r.ok) {
      const d = await r.json()
      setRates([...rates, d.rate])
      toast.success('Added')
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Country</th>
                <th className="text-left p-2 font-medium">Region/State</th>
                <th className="text-left p-2 font-medium">Name</th>
                <th className="text-left p-2 font-medium">Rate (%)</th>
                <th className="text-left p-2 font-medium">Active</th>
                <th className="w-32 p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map(r => (
                <tr key={r.id}>
                  <td className="p-2"><Input value={r.country} onChange={(e) => update(r.id, 'country', e.target.value)} className="h-8 w-20" /></td>
                  <td className="p-2"><Input value={r.region || ''} onChange={(e) => update(r.id, 'region', e.target.value)} className="h-8 w-24" placeholder="Any" /></td>
                  <td className="p-2"><Input value={r.name || ''} onChange={(e) => update(r.id, 'name', e.target.value)} className="h-8 w-32" /></td>
                  <td className="p-2"><Input type="number" step="0.01" value={r.rate} onChange={(e) => update(r.id, 'rate', e.target.value)} className="h-8 w-20" /></td>
                  <td className="p-2"><Switch checked={r.isActive} onCheckedChange={(v) => update(r.id, 'isActive', v)} /></td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => save(r.id)} disabled={saving === r.id}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Button variant="outline" onClick={addNew}>
        <Plus className="h-4 w-4 mr-2" /> Add Tax Rate
      </Button>
    </div>
  )
}
