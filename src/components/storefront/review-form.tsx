'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/lib/toast'
import { Star, Check } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

export function ReviewForm({ productId }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    rating: 5,
    authorName: '',
    title: '',
    body: '',
    email: '',
    consent: false
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.consent) {
      toast.error('Consent required', 'Please accept the consent checkbox to submit a review.')
      return
    }
    if (!form.authorName || !form.body) {
      toast.error('Required fields', 'Please enter your name and review.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, productId })
      })
      if (r.ok) {
        toast.success('Review submitted', 'It will appear once approved by our team.')
        setForm({ rating: 5, authorName: '', title: '', body: '', email: '', consent: false })
        setOpen(false)
      } else {
        const d = await r.json()
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border p-5 space-y-3">
      <h3 className="font-semibold">Write a review</h3>

      <div>
        <Label className="text-xs">Rating</Label>
        <div className="flex items-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setForm(f => ({ ...f, rating: n }))}
              className="p-1"
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            >
              <Star className={`h-5 w-5 ${n <= form.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Your name <span className="text-destructive">*</span></Label>
        <Input value={form.authorName} onChange={(e) => setForm(f => ({ ...f, authorName: e.target.value }))} required />
      </div>

      <div>
        <Label className="text-xs">Email (optional)</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        <p className="text-xs text-muted-foreground mt-1">Only used to notify you when your review is approved.</p>
      </div>

      <div>
        <Label className="text-xs">Title (optional)</Label>
        <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Great product!" />
      </div>

      <div>
        <Label className="text-xs">Review <span className="text-destructive">*</span></Label>
        <Textarea rows={4} value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} required />
      </div>

      <label className="flex items-start gap-2 text-xs cursor-pointer">
        <Checkbox
          checked={form.consent}
          onCheckedChange={(v) => setForm(f => ({ ...f, consent: v }))}
          className="mt-0.5"
        />
        <span className="text-muted-foreground">
          I consent to my review being published and understand it will be moderated before appearing publicly.
          See our <a href="/privacy" className="text-foreground hover:underline">Privacy Policy</a>.
        </span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Submitting...' : <>Submit review</>}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}
