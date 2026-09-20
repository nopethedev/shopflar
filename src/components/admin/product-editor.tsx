'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { slugify } from '@/lib/settings'
import { Plus, Trash2, Upload, X, Save, ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'

const emptyProduct = {
  name: '', slug: '', description: '', shortDescription: '',
  price: 0, compareAtPrice: null, sku: '', barcode: '',
  inventoryQty: 0, lowStockThreshold: 5, status: 'DRAFT', featured: false,
  weight: null, length: null, width: null, height: null,
  seoTitle: '', seoDescription: '',
  images: [], variants: [], categoryIds: [], tags: []
}

export function ProductEditor({ product, categories }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => product ? {
    ...product,
    compareAtPrice: product.compareAtPrice,
    costPrice: product.costPrice,
    weight: product.weight,
    length: product.length, width: product.width, height: product.height,
    categoryIds: product.categories.map(c => c.categoryId),
    images: product.images.map(i => ({ ...i, isNew: false })),
    variants: product.variants.map(v => ({ ...v, options: typeof v.options === 'string' ? JSON.parse(v.options) : v.options })),
    tags: product.tags.map(t => t.tag)
  } : { ...emptyProduct })
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newVariantOpt, setNewVariantOpt] = useState({ name: '', value: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addImage = () => {
    if (!newImageUrl) return
    setForm(f => ({ ...f, images: [...f.images, { url: newImageUrl, sortOrder: f.images.length, isNew: true, id: `new_${Date.now()}` }] }))
    setNewImageUrl('')
  }

  const removeImage = (id) => {
    setForm(f => ({ ...f, images: f.images.filter(i => i.id !== id) }))
  }

  const addVariant = () => {
    if (!newVariantOpt.name || !newVariantOpt.value) {
      toast.error('Add option name and value')
      return
    }
    const [optName, optValue] = [newVariantOpt.name, newVariantOpt.value]
    setForm(f => ({
      ...f,
      variants: [...f.variants, {
        id: `new_${Date.now()}`,
        name: `${optName}: ${optValue}`,
        options: { [optName]: optValue },
        sku: '',
        price: null,
        inventoryQty: 0,
        isNew: true
      }]
    }))
    setNewVariantOpt({ name: '', value: '' })
  }

  const updateVariant = (id, field, value) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => v.id === id ? { ...v, [field]: value } : v)
    }))
  }

  const removeVariant = (id) => {
    setForm(f => ({ ...f, variants: f.variants.filter(v => v.id !== id) }))
  }

  const save = async () => {
    if (!form.name) { toast.error('Name required'); return }
    if (!form.slug) { set('slug', slugify(form.name)) }
    setSaving(true)

    try {
      const slug = form.slug || slugify(form.name)
      const payload = {
        name: form.name,
        slug: slug === product?.slug ? slug : slug + (product ? '' : ''),
        description: form.description || null,
        shortDescription: form.shortDescription || null,
        price: Number(form.price) || 0,
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        sku: form.sku || null,
        barcode: form.barcode || null,
        inventoryQty: parseInt(form.inventoryQty) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        status: form.status,
        featured: !!form.featured,
        isOutOfStock: parseInt(form.inventoryQty) <= 0,
        weight: form.weight ? Number(form.weight) : null,
        length: form.length ? Number(form.length) : null,
        width: form.width ? Number(form.width) : null,
        height: form.height ? Number(form.height) : null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        categoryIds: form.categoryIds,
        tags: form.tags,
        images: form.images.map((i, idx) => ({ id: i.isNew ? undefined : i.id, url: i.url, sortOrder: idx, altText: i.altText || null })),
        variants: form.variants.map(v => ({
          id: v.isNew ? undefined : v.id,
          name: v.name,
          options: JSON.stringify(v.options),
          sku: v.sku || null,
          price: v.price ? Number(v.price) : null,
          inventoryQty: parseInt(v.inventoryQty) || 0
        }))
      }

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products'
      const method = product ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')

      toast.success('Saved', product ? 'Product updated' : 'Product created')
      router.push('/admin/products')
      router.refresh()
    } catch (e) {
      toast.error('Save failed', e.message)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/products"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {product ? 'Edit Product' : 'New Product'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {product ? `Editing ${product.name}` : 'Create a new product'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full overflow-x-auto flex justify-start h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          {product?.printifyLink && <TabsTrigger value="printify">Printify</TabsTrigger>}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => { set('name', e.target.value); if (!product) set('slug', slugify(e.target.value)) }} placeholder="Product name" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated-from-name" />
            </div>
            <div>
              <Label>Short Description</Label>
              <Input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One-line summary shown on cards" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={8} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="<p>Full product description</p>" />
              <p className="text-xs text-muted-foreground mt-1">Supports HTML.</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Show in featured section on homepage</p>
              </div>
              <Switch checked={form.featured} onCheckedChange={(c) => set('featured', c)} />
            </div>
          </Card>
        </TabsContent>

        {/* IMAGES */}
        <TabsContent value="images" className="mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Add image by URL</Label>
              <div className="flex gap-2">
                <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://..." />
                <Button onClick={addImage} type="button"><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">In production, images upload to Supabase Storage. For demo, paste a URL.</p>
            </div>

            <div>
              <Label>Current images ({form.images.length})</Label>
              {form.images.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
                  No images yet. Add the first one above.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {form.images.map((img, i) => (
                    <div key={img.id} className="relative aspect-square rounded-md overflow-hidden bg-muted group">
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <button
                          onClick={() => removeImage(img.id)}
                          className="opacity-0 group-hover:opacity-100 text-white bg-rose-600 rounded-md p-2"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {i === 0 && <span className="absolute top-1 left-1 text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded">Primary</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* PRICING */}
        <TabsContent value="pricing" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Price <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
              <div>
                <Label>Compare-at price</Label>
                <Input type="number" step="0.01" value={form.compareAtPrice || ''} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="Original price" />
                <p className="text-xs text-muted-foreground mt-1">Show as crossed out</p>
              </div>
              <div>
                <Label>Cost per item</Label>
                <Input type="number" step="0.01" value={form.costPrice || ''} onChange={(e) => set('costPrice', e.target.value)} placeholder="Internal cost" />
              </div>
            </div>
            <div className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
              {form.compareAtPrice && Number(form.compareAtPrice) > Number(form.price) ? (
                <span>
                  ✓ On sale ·{' '}
                  <span className="text-emerald-600 font-semibold">
                    {Math.round(((form.compareAtPrice - form.price) / form.compareAtPrice) * 100)}% off
                  </span>
                </span>
              ) : (
                'Not on sale'
              )}
            </div>
          </Card>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Stock keeping unit" />
              </div>
              <div>
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="ISBN, UPC, GTIN..." />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.inventoryQty} onChange={(e) => set('inventoryQty', e.target.value)} />
              </div>
              <div>
                <Label>Low-stock threshold</Label>
                <Input type="number" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>

        {/* VARIANTS */}
        <TabsContent value="variants" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input placeholder="Option name (e.g., Size)" value={newVariantOpt.name} onChange={(e) => setNewVariantOpt({ ...newVariantOpt, name: e.target.value })} />
              <Input placeholder="Option value (e.g., M)" value={newVariantOpt.value} onChange={(e) => setNewVariantOpt({ ...newVariantOpt, value: e.target.value })} />
              <Button onClick={addVariant} type="button"><Plus className="h-4 w-4" /> Add</Button>
            </div>

            {form.variants.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
                No variants yet. Add size/color options above.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">SKU</th>
                      <th className="text-left p-2 font-medium">Price override</th>
                      <th className="text-left p-2 font-medium">Stock</th>
                      <th className="w-10 p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {form.variants.map(v => (
                      <tr key={v.id}>
                        <td className="p-2">{v.name}</td>
                        <td className="p-2"><Input value={v.sku || ''} onChange={(e) => updateVariant(v.id, 'sku', e.target.value)} className="h-8" /></td>
                        <td className="p-2"><Input type="number" step="0.01" value={v.price || ''} onChange={(e) => updateVariant(v.id, 'price', e.target.value)} className="h-8 w-24" placeholder="Default" /></td>
                        <td className="p-2"><Input type="number" value={v.inventoryQty} onChange={(e) => updateVariant(v.id, 'inventoryQty', e.target.value)} className="h-8 w-20" /></td>
                        <td className="p-2"><button onClick={() => removeVariant(v.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* CATEGORIES */}
        <TabsContent value="categories" className="mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Categories</Label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-96 overflow-y-auto p-2 border border-border rounded-md">
                {categories.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-muted/40 rounded">
                    <Checkbox
                      checked={form.categoryIds.includes(c.id)}
                      onCheckedChange={(checked) => {
                        if (checked) set('categoryIds', [...form.categoryIds, c.id])
                        else set('categoryIds', form.categoryIds.filter(id => id !== c.id))
                      }}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newTag) { set('tags', [...form.tags, newTag.toLowerCase()]); setNewTag('') } } }} />
                <Button onClick={() => { if (newTag) { set('tags', [...form.tags, newTag.toLowerCase()]); setNewTag('') } }} type="button">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs">
                    {t}
                    <button onClick={() => set('tags', form.tags.filter(x => x !== t))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>SEO Title</Label>
              <Input value={form.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} placeholder="Defaults to product name" />
              <p className="text-xs text-muted-foreground mt-1">{(form.seoTitle || form.name).length}/60 characters</p>
            </div>
            <div>
              <Label>SEO Description</Label>
              <Textarea rows={3} value={form.seoDescription || ''} onChange={(e) => set('seoDescription', e.target.value)} placeholder="Defaults to short description" />
              <p className="text-xs text-muted-foreground mt-1">{(form.seoDescription || form.shortDescription || '').length}/160 characters</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground mb-2">Preview in search results:</p>
              <p className="text-sm font-medium text-blue-700 truncate">{form.seoTitle || form.name}</p>
              <p className="text-xs text-emerald-700 truncate">/products/{form.slug || 'product-slug'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{form.seoDescription || form.shortDescription || 'Description preview...'}</p>
            </div>
          </Card>
        </TabsContent>

        {/* SHIPPING */}
        <TabsContent value="shipping" className="mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.01" value={form.weight || ''} onChange={(e) => set('weight', e.target.value)} />
              </div>
              <div></div>
              <div>
                <Label>Length (cm)</Label>
                <Input type="number" step="0.1" value={form.length || ''} onChange={(e) => set('length', e.target.value)} />
              </div>
              <div>
                <Label>Width (cm)</Label>
                <Input type="number" step="0.1" value={form.width || ''} onChange={(e) => set('width', e.target.value)} />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" step="0.1" value={form.height || ''} onChange={(e) => set('height', e.target.value)} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* PRINTIFY */}
        {product?.printifyLink && (
          <TabsContent value="printify" className="mt-4">
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Printify Linked</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><Label>Printify Product ID</Label><Input value={product.printifyLink.printifyProductId} disabled /></div>
                <div><Label>Printify Shop ID</Label><Input value={product.printifyLink.printifyShopId || ''} disabled /></div>
                <div><Label>Last Synced</Label><Input value={product.printifyLink.lastSyncedAt ? new Date(product.printifyLink.lastSyncedAt).toLocaleString() : 'Never'} disabled /></div>
              </div>
              <Button variant="outline" onClick={async () => {
                const r = await fetch(`/api/printify/sync?productId=${product.id}`, { method: 'POST' })
                if (r.ok) { toast.success('Synced'); router.refresh() } else { toast.error('Sync failed') }
              }}>Sync Now</Button>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
