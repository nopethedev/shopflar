'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { Save, RotateCcw, FileText, Shield, Cookie, Scale } from 'lucide-react'

const PAGES = [
  { key: 'refund_policy', label: 'Refund Policy', icon: RotateCcw, slug: '/returns' },
  { key: 'privacy_policy', label: 'Privacy Policy', icon: Shield, slug: '/privacy' },
  { key: 'terms_and_conditions', label: 'Terms & Conditions', icon: Scale, slug: '/terms' },
  { key: 'cookie_policy', label: 'Cookie Policy', icon: Cookie, slug: '/cookies' }
]

export function AdminLegalEditor({ initial }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState(initial)

  const save = async (key) => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/legal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, content: content[key] })
      })
      if (r.ok) {
        toast.success('Saved', `${PAGES.find(p => p.key === key)?.label} updated`)
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = async (key) => {
    if (!confirm('Reset to default content? This will clear your custom text.')) return
    setContent(c => ({ ...c, [key]: '' }))
    await fetch('/api/admin/legal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, content: '' })
    })
    toast.success('Reset to default')
    router.refresh()
  }

  return (
    <Tabs defaultValue="refund_policy">
      <TabsList className="flex flex-wrap h-auto">
        {PAGES.map(p => (
          <TabsTrigger key={p.key} value={p.key} className="flex items-center gap-1.5">
            <p.icon className="h-3.5 w-3.5" />
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {PAGES.map(p => (
        <TabsContent key={p.key} value={p.key} className="mt-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p.icon className="h-4 w-4" />
                <h3 className="font-semibold">{p.label}</h3>
              </div>
              <a href={p.slug} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                View on storefront →
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default content. HTML is supported (e.g. <code>{'<h2>Heading</h2><p>Text</p>'}</code>).
              Business details from <a href="/admin/business" className="text-foreground hover:underline">Business Details</a> are auto-included at the bottom.
            </p>
            <Textarea
              rows={14}
              value={content[p.key]}
              onChange={(e) => setContent(c => ({ ...c, [p.key]: e.target.value }))}
              placeholder="Leave blank to use default content..."
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => reset(p.key)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to default
              </Button>
              <Button size="sm" onClick={() => save(p.key)} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}
