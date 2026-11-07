'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, Loader2, Palette, Search, ExternalLink, Sparkles, SlidersHorizontal, Eye
} from 'lucide-react'
import { THEMES, THEME_CATEGORIES, applyThemePreset, type ThemePreset } from '@/lib/themes'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

function radiusFor(theme: ThemePreset) {
  return theme.settings.button_style === 'pill' ? '999px' : theme.settings.button_style === 'square' ? '0px' : '7px'
}

function ThemeMock({ theme }: { theme: ThemePreset }) {
  const s = theme.settings
  const headingFont = s.heading_font === 'Display' ? 'inherit' : `'${s.heading_font}', serif`
  return (
    <div className="theme-mock h-[168px] w-full" style={{ backgroundColor: s.background_color }}>
      {/* browser-ish chrome */}
      <div className="h-5 flex items-center gap-1 px-2.5 border-b" style={{ borderColor: `${s.text_color}18`, backgroundColor: s.background_color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `${s.text_color}30` }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `${s.text_color}30` }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `${s.text_color}30` }} />
        <span className="ml-1 text-[5px] tracking-wide uppercase" style={{ color: `${s.text_color}80` }}>{s.font_family}</span>
      </div>
      {/* nav */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: `1px solid ${s.text_color}14` }}>
        <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: s.text_color }}>Store</span>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => <span key={i} className="block h-[2px] w-4 rounded" style={{ backgroundColor: `${s.text_color}35` }} />)}
        </div>
        <span className="block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `${s.text_color}25` }} />
      </div>
      {/* hero */}
      <div className="relative px-3 pt-4 pb-3" style={{ background: `linear-gradient(135deg, ${s.secondary_color}22, ${s.accent_color}18)` }}>
        <p className="text-[5px] uppercase tracking-[0.18em] mb-1" style={{ color: s.accent_color }}>New arrivals</p>
        <p className="text-[13px] leading-[1.05] max-w-[78%] font-semibold" style={{ color: s.text_color, fontFamily: headingFont }}>
          Considered essentials
        </p>
        <span
          className="mt-2 inline-block text-[5.5px] font-semibold px-2 py-1"
          style={{ backgroundColor: s.primary_color, color: s.background_color, borderRadius: radiusFor(theme) }}
        >
          Shop now
        </span>
      </div>
      {/* product row */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pt-2">
        {[0, 1, 2].map(i => (
          <div key={i}>
            <div className="aspect-square rounded-[3px]" style={{ backgroundColor: i === 0 ? `${s.accent_color}55` : i === 1 ? `${s.secondary_color}40` : `${s.text_color}12` }} />
            <div className="mt-1 h-[2px] w-3/4 rounded" style={{ backgroundColor: `${s.text_color}35` }} />
            <div className="mt-0.5 h-[2px] w-1/3 rounded" style={{ backgroundColor: `${s.accent_color}` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ThemeLibrary({ activeThemeId, appearance }: { activeThemeId: string; appearance: Record<string, string> }) {
  const router = useRouter()
  const [category, setCategory] = useState<string>('All')
  const [query, setQuery] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [activeId, setActiveId] = useState(activeThemeId)

  const themes = useMemo(() => THEMES.filter(t =>
    (category === 'All' || t.category === category) &&
    (!query || `${t.name} ${t.desc} ${t.category}`.toLowerCase().includes(query.toLowerCase()))
  ), [category, query])

  const active = THEMES.find(t => t.id === activeId) || THEMES[0]

  const apply = async (theme: ThemePreset) => {
    setApplying(theme.id)
    try {
      await applyThemePreset(theme)
      setActiveId(theme.id)
      toast.success(`"${theme.name}" is now your theme`, 'Open the storefront to see it live')
      router.refresh()
    } catch (e) {
      toast.error('Could not apply theme', e.message)
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current theme */}
      <div className="sf-card overflow-hidden">
        <div className="grid md:grid-cols-[260px_1fr]">
          <div className="border-b md:border-b-0 md:border-r border-[#e3e3e3] bg-[#fafafa] p-4">
            <div className="rounded-lg overflow-hidden border border-[#e3e3e3] bg-white shadow-sm">
              <ThemeMock theme={active} />
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="sf-badge sf-badge-success"><Check className="h-3 w-3" /> Current theme</span>
              <span className="sf-badge sf-badge-neutral">{active.category}</span>
            </div>
            <h2 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">{active.name}</h2>
            <p className="text-[13px] text-[#616161] mt-1 max-w-xl">{active.desc}. Powered by Shopflar — every theme is responsive, accessible and works with all sections in the theme editor.</p>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 max-w-xl">
              {[
                ['Body font', active.settings.font_family],
                ['Heading font', active.settings.heading_font === 'Display' ? 'Plus Jakarta Sans' : active.settings.heading_font],
                ['Buttons', active.settings.button_style],
                ['Corner radius', active.settings.card_radius]
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-[#8a8a8a] uppercase tracking-wide">{k}</dt>
                  <dd className="text-[13px] font-medium text-[#303030] truncate capitalize">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-2 mt-5">
              <Link href="/admin/builder" className="sf-btn sf-btn-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
              </Link>
              <Link href="/" target="_blank" className="sf-btn sf-btn-secondary">
                <Eye className="h-3.5 w-3.5" /> Preview store
              </Link>
              <Link href="/admin/appearance" className="sf-btn sf-btn-secondary">
                <Palette className="h-3.5 w-3.5" /> Colors & fonts
              </Link>
            </div>

            {appearance?.primary_color && (
              <p className="text-[11px] text-[#8a8a8a] mt-3">
                Fine-tuned colors: primary {appearance.primary_color}, accent {appearance.accent_color}. Applying a theme replaces these tokens.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Library */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1a1a1a] flex items-center gap-2">
              Theme library <span className="sf-badge sf-badge-neutral">{THEMES.length}</span>
            </h2>
            <p className="text-[12px] text-[#616161] mt-0.5">Install a new look in one click. Your content, products and pages stay exactly where they are.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8a8a8a]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search themes…"
              className="sf-input h-8 pl-8 w-60"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {THEME_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'h-7 px-2.5 rounded-lg text-[12px] font-medium border transition-colors',
                category === c
                  ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                  : 'bg-white text-[#303030] border-[#d9d9d9] hover:bg-[#fafafa]'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {themes.map(theme => {
            const isActive = theme.id === activeId
            return (
              <div key={theme.id} className={cn('sf-card overflow-hidden group', isActive && 'ring-2 ring-[#1a1a1a]')}>
                <div className="border-b border-[#e3e3e3] bg-[#fafafa] p-2.5">
                  <div className="rounded-md overflow-hidden border border-[#e3e3e3] bg-white">
                    <ThemeMock theme={theme} />
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                        {theme.name}
                        {isActive && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      </p>
                      <p className="text-[11px] text-[#8a8a8a]">{theme.category} · {theme.settings.font_family} + {theme.settings.heading_font === 'Display' ? 'Jakarta' : theme.settings.heading_font}</p>
                    </div>
                    <div className="flex -space-x-1 shrink-0">
                      {theme.swatch.map((c, i) => (
                        <span key={i} className="h-3.5 w-3.5 rounded-full border border-white ring-1 ring-black/5" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] text-[#616161] mt-1 line-clamp-2">{theme.desc}</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    {isActive ? (
                      <>
                        <Link href="/admin/builder" className="sf-btn sf-btn-primary flex-1">Customize</Link>
                        <Link href="/" target="_blank" className="sf-btn sf-btn-secondary" title="Preview"><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => apply(theme)}
                          disabled={!!applying}
                          className="sf-btn sf-btn-primary flex-1 disabled:opacity-60"
                        >
                          {applying === theme.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {applying === theme.id ? 'Applying…' : 'Use theme'}
                        </button>
                        <Link
                          href={`/admin/builder`}
                          className="sf-btn sf-btn-secondary"
                          title="Open editor"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {themes.length === 0 && (
          <div className="sf-card p-10 text-center text-[13px] text-[#616161]">No themes match “{query}”.</div>
        )}
      </div>
    </div>
  )
}
