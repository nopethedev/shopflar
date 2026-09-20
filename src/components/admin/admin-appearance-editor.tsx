'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { Save, Palette, Image as ImageIcon, Type, Layout } from 'lucide-react'

export function AdminAppearanceEditor({ settings, appearance }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [storeSettings, setStoreSettings] = useState({
    store_name: settings.store_name || '',
    store_title: settings.store_title || '',
    store_description: settings.store_description || '',
    store_email: settings.store_email || '',
    store_phone: settings.store_phone || '',
    store_address: settings.store_address || '',
    logo_url: settings.logo_url || '',
    favicon_url: settings.favicon_url || '',
    footer_text: settings.footer_text || '',
    hero_image: settings.hero_image || '',
    hero_title: settings.hero_title || '',
    hero_subtitle: settings.hero_subtitle || '',
    hero_button_text: settings.hero_button_text || '',
    hero_button_url: settings.hero_button_url || '',
    featured_section_title: settings.featured_section_title || '',
    featured_section_subtitle: settings.featured_section_subtitle || '',
    new_arrivals_title: settings.new_arrivals_title || '',
    newsletter_title: settings.newsletter_title || '',
    newsletter_subtitle: settings.newsletter_subtitle || '',
    social_twitter: settings.social_twitter || '',
    social_instagram: settings.social_instagram || '',
    social_facebook: settings.social_facebook || '',
    social_tiktok: settings.social_tiktok || ''
  })
  const [appearanceSettings, setAppearanceSettings] = useState({
    primary_color: appearance.primary_color || '#1a1a1a',
    secondary_color: appearance.secondary_color || '#6b7280',
    accent_color: appearance.accent_color || '#d97706',
    background_color: appearance.background_color || '#ffffff',
    text_color: appearance.text_color || '#1a1a1a',
    button_style: appearance.button_style || 'rounded',
    font_family: appearance.font_family || 'Inter',
    heading_font: appearance.heading_font || 'Display',
    card_radius: appearance.card_radius || '0.75rem'
  })

  const saveStore = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeSettings)
      })
      if (r.ok) { toast.success('Settings saved'); router.refresh() }
      else throw new Error('Failed')
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveAppearance = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/appearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appearanceSettings)
      })
      if (r.ok) { toast.success('Appearance saved'); router.refresh() }
      else throw new Error('Failed')
    } catch (e) {
      toast.error('Save failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general"><Layout className="h-3.5 w-3.5 mr-1.5" /> Store</TabsTrigger>
        <TabsTrigger value="hero"><ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Hero</TabsTrigger>
        <TabsTrigger value="social">Social</TabsTrigger>
        <TabsTrigger value="colors"><Palette className="h-3.5 w-3.5 mr-1.5" /> Colors</TabsTrigger>
        <TabsTrigger value="typography"><Type className="h-3.5 w-3.5 mr-1.5" /> Typography</TabsTrigger>
      </TabsList>

      {/* STORE GENERAL */}
      <TabsContent value="general" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Store name</Label><Input value={storeSettings.store_name} onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })} /></div>
            <div><Label>Store title (browser tab)</Label><Input value={storeSettings.store_title} onChange={(e) => setStoreSettings({ ...storeSettings, store_title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Store description</Label><Textarea rows={2} value={storeSettings.store_description} onChange={(e) => setStoreSettings({ ...storeSettings, store_description: e.target.value })} /></div>
            <div><Label>Contact email</Label><Input value={storeSettings.store_email} onChange={(e) => setStoreSettings({ ...storeSettings, store_email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={storeSettings.store_phone} onChange={(e) => setStoreSettings({ ...storeSettings, store_phone: e.target.value })} /></div>
            <div><Label>Address (text)</Label><Input value={storeSettings.store_address} onChange={(e) => setStoreSettings({ ...storeSettings, store_address: e.target.value })} /></div>
            <div><Label>Logo URL</Label><Input value={storeSettings.logo_url} onChange={(e) => setStoreSettings({ ...storeSettings, logo_url: e.target.value })} placeholder="https://..." /></div>
            <div className="sm:col-span-2"><Label>Footer text</Label><Input value={storeSettings.footer_text} onChange={(e) => setStoreSettings({ ...storeSettings, footer_text: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Featured section title</Label><Input value={storeSettings.featured_section_title} onChange={(e) => setStoreSettings({ ...storeSettings, featured_section_title: e.target.value })} /></div>
            <div><Label>New arrivals title</Label><Input value={storeSettings.new_arrivals_title} onChange={(e) => setStoreSettings({ ...storeSettings, new_arrivals_title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Featured section subtitle</Label><Input value={storeSettings.featured_section_subtitle} onChange={(e) => setStoreSettings({ ...storeSettings, featured_section_subtitle: e.target.value })} /></div>
            <div><Label>Newsletter title</Label><Input value={storeSettings.newsletter_title} onChange={(e) => setStoreSettings({ ...storeSettings, newsletter_title: e.target.value })} /></div>
            <div><Label>Newsletter subtitle</Label><Input value={storeSettings.newsletter_subtitle} onChange={(e) => setStoreSettings({ ...storeSettings, newsletter_subtitle: e.target.value })} /></div>
          </div>
          <Button onClick={saveStore} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Store Settings'}</Button>
        </Card>
      </TabsContent>

      {/* HERO */}
      <TabsContent value="hero" className="mt-4">
        <Card className="p-5 space-y-4">
          <div><Label>Hero image URL</Label><Input value={storeSettings.hero_image} onChange={(e) => setStoreSettings({ ...storeSettings, hero_image: e.target.value })} placeholder="https://..." /></div>
          {storeSettings.hero_image && (
            <div className="aspect-[16/6] rounded-lg overflow-hidden bg-muted">
              <img src={storeSettings.hero_image} alt="Hero preview" className="h-full w-full object-cover" />
            </div>
          )}
          <div><Label>Hero title</Label><Input value={storeSettings.hero_title} onChange={(e) => setStoreSettings({ ...storeSettings, hero_title: e.target.value })} /></div>
          <div><Label>Hero subtitle</Label><Textarea rows={3} value={storeSettings.hero_subtitle} onChange={(e) => setStoreSettings({ ...storeSettings, hero_subtitle: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Hero button text</Label><Input value={storeSettings.hero_button_text} onChange={(e) => setStoreSettings({ ...storeSettings, hero_button_text: e.target.value })} /></div>
            <div><Label>Hero button URL</Label><Input value={storeSettings.hero_button_url} onChange={(e) => setStoreSettings({ ...storeSettings, hero_button_url: e.target.value })} /></div>
          </div>
          <Button onClick={saveStore} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Hero'}</Button>
        </Card>
      </TabsContent>

      {/* SOCIAL */}
      <TabsContent value="social" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Twitter URL</Label><Input value={storeSettings.social_twitter} onChange={(e) => setStoreSettings({ ...storeSettings, social_twitter: e.target.value })} placeholder="https://twitter.com/..." /></div>
            <div><Label>Instagram URL</Label><Input value={storeSettings.social_instagram} onChange={(e) => setStoreSettings({ ...storeSettings, social_instagram: e.target.value })} placeholder="https://instagram.com/..." /></div>
            <div><Label>Facebook URL</Label><Input value={storeSettings.social_facebook} onChange={(e) => setStoreSettings({ ...storeSettings, social_facebook: e.target.value })} placeholder="https://facebook.com/..." /></div>
            <div><Label>TikTok URL</Label><Input value={storeSettings.social_tiktok} onChange={(e) => setStoreSettings({ ...storeSettings, social_tiktok: e.target.value })} placeholder="https://tiktok.com/@..." /></div>
          </div>
          <Button onClick={saveStore} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Social Links'}</Button>
        </Card>
      </TabsContent>

      {/* COLORS */}
      <TabsContent value="colors" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'primary_color', label: 'Primary color' },
              { key: 'secondary_color', label: 'Secondary color' },
              { key: 'accent_color', label: 'Accent color' },
              { key: 'background_color', label: 'Background color' },
              { key: 'text_color', label: 'Text color' }
            ].map(c => (
              <div key={c.key}>
                <Label>{c.label}</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={appearanceSettings[c.key]}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, [c.key]: e.target.value })}
                    className="h-9 w-12 rounded border border-input cursor-pointer"
                  />
                  <Input value={appearanceSettings[c.key]} onChange={(e) => setAppearanceSettings({ ...appearanceSettings, [c.key]: e.target.value })} className="font-mono" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Label>Button style</Label>
            <div className="flex gap-2 mt-1">
              {['rounded', 'pill', 'square'].map(s => (
                <button
                  key={s}
                  onClick={() => setAppearanceSettings({ ...appearanceSettings, button_style: s })}
                  className={`px-4 py-2 text-sm border rounded-md ${appearanceSettings.button_style === s ? 'border-foreground bg-foreground text-background' : 'border-border'}`}
                  style={{ borderRadius: s === 'pill' ? '9999px' : s === 'rounded' ? '6px' : '0' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Card radius</Label>
            <Input value={appearanceSettings.card_radius} onChange={(e) => setAppearanceSettings({ ...appearanceSettings, card_radius: e.target.value })} placeholder="0.75rem" />
          </div>
          <Button onClick={saveAppearance} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Appearance'}</Button>
        </Card>
      </TabsContent>

      {/* TYPOGRAPHY */}
      <TabsContent value="typography" className="mt-4">
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Body font family</Label>
              <Input value={appearanceSettings.font_family} onChange={(e) => setAppearanceSettings({ ...appearanceSettings, font_family: e.target.value })} />
            </div>
            <div>
              <Label>Heading font</Label>
              <Input value={appearanceSettings.heading_font} onChange={(e) => setAppearanceSettings({ ...appearanceSettings, heading_font: e.target.value })} />
            </div>
          </div>
          <Button onClick={saveAppearance} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Typography'}</Button>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
