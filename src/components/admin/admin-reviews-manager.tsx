'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'
import { Check, Trash2, Plus, Star } from 'lucide-react'

export function AdminReviewsManager({ initialReviews }) {
  const router = useRouter()
  const [reviews, setReviews] = useState(initialReviews)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [newReview, setNewReview] = useState({
    productId: '',
    rating: 5,
    authorName: '',
    title: '',
    body: '',
    isApproved: true
  })
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)

  // Load products for the add form
  const loadProducts = async () => {
    if (products.length > 0) return
    const r = await fetch('/api/admin/products?limit=200')
    const d = await r.json()
    setProducts(d.products || [])
  }

  const toggleApprove = async (id, current) => {
    const r = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApproved: !current })
    })
    if (r.ok) {
      setReviews(reviews.map(rv => rv.id === id ? { ...rv, isApproved: !current } : rv))
      toast.success(!current ? 'Approved' : 'Unapproved')
    }
  }

  const del = async (id) => {
    if (!confirm('Delete this review?')) return
    const r = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    if (r.ok) {
      setReviews(reviews.filter(rv => rv.id !== id))
      toast.success('Deleted')
    }
  }

  const addReview = async (e) => {
    e.preventDefault()
    if (!newReview.productId || !newReview.authorName || !newReview.body) {
      toast.error('Required fields', 'Product, author name, and review text are required.')
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
      })
      if (r.ok) {
        const d = await r.json()
        // Add to list with product name resolved
        const prod = products.find(p => p.id === newReview.productId)
        setReviews([{ ...d.review, product: { name: prod?.name || '', id: prod?.id || '' } }, ...reviews])
        toast.success('Review added')
        setNewReview({ productId: '', rating: 5, authorName: '', title: '', body: '', isApproved: true })
        setShowAddForm(false)
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = reviews.filter(r => {
    if (filter === 'pending' && r.isApproved) return false
    if (filter === 'approved' && !r.isApproved) return false
    if (search) {
      const s = search.toLowerCase()
      return r.authorName?.toLowerCase().includes(s) ||
             r.body?.toLowerCase().includes(s) ||
             r.product?.name?.toLowerCase().includes(s)
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm flex-1 min-w-[200px]"
        />
        <div className="flex gap-1">
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All ({reviews.length})</Button>
          <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending ({reviews.filter(r => !r.isApproved).length})</Button>
          <Button size="sm" variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>Approved ({reviews.filter(r => r.isApproved).length})</Button>
        </div>
        <Button size="sm" onClick={() => { setShowAddForm(!showAddForm); loadProducts() }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Review
        </Button>
      </div>

      {/* Add review form */}
      {showAddForm && (
        <Card className="p-5">
          <form onSubmit={addReview} className="space-y-3">
            <h3 className="font-semibold">Add a review (admin-curated)</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Product <span className="text-destructive">*</span></Label>
                <select
                  value={newReview.productId}
                  onChange={(e) => setNewReview({ ...newReview, productId: e.target.value })}
                  className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Rating</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setNewReview({ ...newReview, rating: n })} aria-label={`Rate ${n} stars`}>
                      <Star className={`h-5 w-5 ${n <= newReview.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Author name <span className="text-destructive">*</span></Label>
                <Input value={newReview.authorName} onChange={(e) => setNewReview({ ...newReview, authorName: e.target.value })} placeholder="John D." required />
              </div>
              <div>
                <Label className="text-xs">Title (optional)</Label>
                <Input value={newReview.title} onChange={(e) => setNewReview({ ...newReview, title: e.target.value })} placeholder="Great product!" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Review text <span className="text-destructive">*</span></Label>
              <Textarea rows={3} value={newReview.body} onChange={(e) => setNewReview({ ...newReview, body: e.target.value })} required />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch checked={newReview.isApproved} onCheckedChange={(v) => setNewReview({ ...newReview, isApproved: v })} />
              <span>Approved (visible on storefront)</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Add review'}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Reviews list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
            No reviews found.
          </div>
        ) : filtered.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex" aria-label={`${r.rating} stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.authorName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  <Badge variant={r.isApproved ? 'default' : 'secondary'}>
                    {r.isApproved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
                {r.product && (
                  <p className="text-xs text-muted-foreground mt-1">
                    On: <a href={`/products/${r.product.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.product.name}</a>
                  </p>
                )}
                {r.title && <p className="text-sm font-medium mt-2">{r.title}</p>}
                {r.body && <p className="text-sm text-muted-foreground mt-1">{r.body}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => toggleApprove(r.id, r.isApproved)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {r.isApproved ? 'Unapprove' : 'Approve'}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
