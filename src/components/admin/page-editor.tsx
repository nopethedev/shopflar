'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'
import { slugify } from '@/lib/settings'
import { Save, ArrowLeft, Eye, FileText } from 'lucide-react'

export function PageEditor({ page }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    excerpt: page?.excerpt || '',
    content: page?.content || '',
    status: page?.status || 'DRAFT',
    showInNav: page?.showInNav ?? false,
    navLabel: page?.navLabel || '',
    sortOrder: page?.sortOrder ?? 0,
    seoTitle: page?.seoTitle || '',
    seoDescription: page?.seoDescription || ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title) {
      toast.error('Title required')
      return
    }
    setSaving(true)
    try {
      const slug = form.slug || slugify(form.title)
      const payload = {
        ...form,
        slug,
        sortOrder: parseInt(form.sortOrder) || 0
      }
      const url = page ? `/api/admin/pages/${page.id}` : '/api/admin/pages'
      const method = page ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) {
        toast.success('Saved')
        router.push('/admin/pages')
        router.refresh()
      } else {
        const d = await r.json()
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/pages"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {page ? 'Edit Page' : 'New Page'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {page ? `Editing "${page.title}"` : 'Create a custom page'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page && form.status === 'PUBLISHED' && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/pages/${form.slug}`} target="_blank"><Eye className="h-3.5 w-3.5 mr-1" /> View</Link>
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <Card className="p-5 space-y-4">
          <div>
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => { set('title', e.target.value); if (!page) set('slug', slugify(e.target.value)) }} placeholder="About Us" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="about-us" className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground mt-1">URL: /pages/{form.slug || 'your-slug'}</p>
          </div>
          <div>
            <Label>Excerpt (optional)</Label>
            <Input value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="Short summary shown in lists" />
          </div>
          <div>
            <Label>Content (HTML supported)</Label>
            <Textarea
              rows={18}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder={'<h2>Our Story</h2>\n<p>We started in...</p>\n<h3>Our Mission</h3>\n<p>...</p>'}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports HTML. Use <code>&lt;h2&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;img&gt;</code>, etc.
            </p>
          </div>
        </Card>

        <Card className="p-5 space-y-4 h-fit">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Show in navigation</Label>
                <p className="text-xs text-muted-foreground">Add a link to this page in the header menu</p>
              </div>
              <Switch checked={form.showInNav} onCheckedChange={(v) => set('showInNav', v)} />
            </div>
            {form.showInNav && (
              <>
                <div>
                  <Label className="text-xs">Nav Label</Label>
                  <Input value={form.navLabel} onChange={(e) => set('navLabel', e.target.value)} placeholder={form.title || 'Page'} />
                </div>
                <div>
                  <Label className="text-xs">Sort order</Label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-border space-y-3">
            <h4 className="text-sm font-semibold">SEO</h4>
            <div>
              <Label className="text-xs">SEO Title</Label>
              <Input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} placeholder={form.title} />
            </div>
            <div>
              <Label className="text-xs">SEO Description</Label>
              <Textarea rows={3} value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} placeholder="Meta description for search engines" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
