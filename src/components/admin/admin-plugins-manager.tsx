'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { Gift, Cookie, Star, Heart, Mail, Plug, Settings, Check } from 'lucide-react'

const ICONS = {
  gift: Gift,
  cookie: Cookie,
  star: Star,
  heart: Heart,
  mail: Mail,
  plug: Plug
}

export function AdminPluginsManager({ plugins: initialPlugins }) {
  const router = useRouter()
  const [plugins, setPlugins] = useState(initialPlugins)
  const [toggling, setToggling] = useState(null)

  const toggle = async (slug, current) => {
    setToggling(slug)
    try {
      const r = await fetch(`/api/admin/plugins/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current })
      })
      if (r.ok) {
        setPlugins(plugins.map(p => p.slug === slug ? { ...p, enabled: !current, installed: true } : p))
        toast.success(!current ? 'Plugin enabled' : 'Plugin disabled')
        router.refresh()
      } else {
        throw new Error('Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {plugins.map(p => {
        const Icon = ICONS[p.icon] || Plug
        return (
          <Card key={p.slug} className="p-5 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${p.enabled ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <Switch
                checked={p.enabled}
                disabled={toggling === p.slug}
                onCheckedChange={() => toggle(p.slug, p.enabled)}
                aria-label={`Enable ${p.name}`}
              />
            </div>
            <h3 className="font-semibold flex items-center gap-2">
              {p.name}
              {p.enabled && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Check className="h-3 w-3 mr-0.5" /> On</Badge>}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex-1">{p.description}</p>
            {p.enabled && p.configPage && (
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link href={p.configPage}><Settings className="h-3.5 w-3.5 mr-1.5" /> Configure</Link>
              </Button>
            )}
            {p.enabled && !p.configPage && (
              <p className="text-xs text-muted-foreground mt-3 text-center">Always on — no configuration needed</p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
