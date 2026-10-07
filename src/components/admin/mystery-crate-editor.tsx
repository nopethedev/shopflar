'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { Gift, Plus, Trash2, Save, Dice5, Package, ArrowRight } from 'lucide-react'

export function MysteryCrateEditor({ products, initialCrates }) {
  const router = useRouter()
  const [crates, setCrates] = useState(initialCrates)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [saving, setSaving] = useState(null)

  // Form for new/edit crate
  const [editing, setEditing] = useState(null)  // null | crate object
  const [guaranteedItems, setGuaranteedItems] = useState([])
  const [poolItems, setPoolItems] = useState([])
  const [poolSize, setPoolSize] = useState(1)

  const startNew = () => {
    setEditing({ isNew: true, productId: '' })
    setGuaranteedItems([])
    setPoolItems([])
    setPoolSize(1)
    setSelectedProductId('')
  }

  const startEdit = (crate) => {
    setEditing({ ...crate, isNew: false })
    setGuaranteedItems(JSON.parse(crate.guaranteedItems || '[]'))
    setPoolItems(JSON.parse(crate.poolItems || '[]'))
    setPoolSize(crate.poolSize || 1)
  }

  const cancel = () => {
    setEditing(null)
    setGuaranteedItems([])
    setPoolItems([])
  }

  const addGuaranteed = (productId) => {
    if (!productId) return
    setGuaranteedItems([...guaranteedItems, { productId, quantity: 1 }])
  }
  const addPool = (productId) => {
    if (!productId) return
    setPoolItems([...poolItems, { productId, weight: 1 }])
  }

  const removeGuaranteed = (idx) => setGuaranteedItems(guaranteedItems.filter((_, i) => i !== idx))
  const removePool = (idx) => setPoolItems(poolItems.filter((_, i) => i !== idx))

  const productName = (id) => products.find(p => p.id === id)?.name || 'Unknown'

  const save = async () => {
    if (!editing?.productId && !selectedProductId) {
      toast.error('Select a product', 'Choose which product becomes a mystery crate.')
      return
    }
    const productId = editing.productId || selectedProductId
    setSaving(productId)
    try {
      const payload = {
        productId,
        guaranteedItems: JSON.stringify(guaranteedItems),
        poolItems: JSON.stringify(poolItems),
        poolSize: parseInt(poolSize) || 1
      }
      const url = editing.isNew ? '/api/admin/mystery-crate' : `/api/admin/mystery-crate/${editing.id}`
      const method = editing.isNew ? 'POST' : 'PATCH'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (r.ok) {
        toast.success('Saved')
        cancel()
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(null)
    }
  }

  const del = async (id) => {
    if (!confirm('Remove mystery crate configuration? The product itself won\'t be deleted.')) return
    const r = await fetch(`/api/admin/mystery-crate/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Removed')
      router.refresh()
    }
  }

  return (
    <div className="space-y-5">
      {/* Existing crates */}
      {crates.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Gift className="h-4 w-4" /> Active Mystery Crates</h3>
          <div className="space-y-2">
            {crates.map(c => {
              const guaranteed = JSON.parse(c.guaranteedItems || '[]')
              const pool = JSON.parse(c.poolItems || '[]')
              return (
                <div key={c.id} className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{c.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {guaranteed.length} guaranteed + {pool.length} pool items, {c.poolSize} random pick{c.poolSize !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(c)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Editor */}
      {editing ? (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Dice5 className="h-4 w-4" />
              {editing.isNew ? 'Create Mystery Crate' : 'Edit Mystery Crate'}
            </h3>
            <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
          </div>

          {/* Select product */}
          {editing.isNew && (
            <div>
              <Label className="text-xs">Product to convert into mystery crate</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger><SelectValue placeholder="Choose a product..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Guaranteed items (always included) */}
          <div>
            <Label className="text-xs font-medium">Guaranteed Items <span className="text-muted-foreground">(always included in the crate)</span></Label>
            <div className="space-y-2 mt-2">
              {guaranteedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded-md">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm">{productName(item.productId)}</span>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => setGuaranteedItems(guaranteedItems.map((g, i) => i === idx ? { ...g, quantity: parseInt(e.target.value) || 1 } : g))}
                    className="w-16 h-7"
                  />
                  <button onClick={() => removeGuaranteed(idx)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Select value="" onValueChange={addGuaranteed}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="+ Add guaranteed product..." /></SelectTrigger>
                  <SelectContent>
                    {products.filter(p => !guaranteedItems.some(g => g.productId === p.id)).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pool items (chance-based) */}
          <div>
            <Label className="text-xs font-medium">Pool Items <span className="text-muted-foreground">(chance-based — weight determines probability)</span></Label>
            <div className="space-y-2 mt-2">
              {poolItems.map((item, idx) => {
                const totalWeight = poolItems.reduce((s, p) => s + p.weight, 0)
                const pct = totalWeight > 0 ? (item.weight / totalWeight * 100).toFixed(1) : 0
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded-md">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 text-sm">{productName(item.productId)}</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        value={item.weight}
                        onChange={(e) => setPoolItems(poolItems.map((p, i) => i === idx ? { ...p, weight: parseInt(e.target.value) || 1 } : p))}
                        className="w-16 h-7"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                    <button onClick={() => removePool(idx)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
              <div className="flex gap-2">
                <Select value="" onValueChange={addPool}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="+ Add pool product..." /></SelectTrigger>
                  <SelectContent>
                    {products.filter(p => !poolItems.some(g => g.productId === p.id)).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pool size */}
          <div>
            <Label className="text-xs font-medium">Random Picks <span className="text-muted-foreground">(how many items to randomly draw from the pool)</span></Label>
            <Input
              type="number"
              min="1"
              value={poolSize}
              onChange={(e) => setPoolSize(parseInt(e.target.value) || 1)}
              className="w-24 mt-1"
            />
          </div>

          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>How it works:</strong> When a customer buys this product, the order will include:
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>All guaranteed items (with their quantities)</li>
              <li>{poolSize} random pick{poolSize !== 1 ? 's' : ''} from the pool, weighted by the numbers above</li>
            </ul>
            The crate product itself is also listed in the order.
          </div>

          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Mystery Crate'}
          </Button>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Create a Mystery Crate</h3>
              <p className="text-sm text-muted-foreground mt-1">Convert any product into a mystery crate with guaranteed + random items.</p>
            </div>
            <Button onClick={startNew}>
              <Plus className="h-4 w-4 mr-2" /> New Mystery Crate
            </Button>
          </div>
        </Card>
      )}

      {/* Help section */}
      <Card className="p-5">
        <h3 className="font-semibold mb-2">How Mystery Crates work</h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Create or pick an existing product to be the &quot;crate&quot; (e.g., &quot;Mystery Tee Box — $50&quot;)</li>
          <li>Configure which products are <strong>guaranteed</strong> (always included)</li>
          <li>Configure which products are in the <strong>pool</strong> (chance-based, weighted)</li>
          <li>Set how many random picks the customer gets</li>
          <li>When a customer buys the crate, the system randomly picks {poolSize || 'N'} items from the pool</li>
          <li>The order is fulfilled with the crate + guaranteed items + random picks</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-3">
          Need a product to use as the crate? <Link href="/admin/products/new" className="text-foreground hover:underline">Create one here <ArrowRight className="inline h-3 w-3" /></Link>
        </p>
      </Card>
    </div>
  )
}
