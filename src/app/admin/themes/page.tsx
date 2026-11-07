import { db } from '@/lib/db'
import { ThemeLibrary } from '@/components/admin/theme-library'
import { THEMES } from '@/lib/themes'

export const dynamic = 'force-dynamic'

export default async function AdminThemesPage() {
  const [appearanceRows, settingRows] = await Promise.all([
    db.appearanceSetting.findMany(),
    db.storeSetting.findMany({ where: { key: 'active_theme' } })
  ])

  const appearance = Object.fromEntries(appearanceRows.map(r => [r.key, r.value]))
  const stored = settingRows[0]?.value || 'dawn'
  const activeThemeId = THEMES.some(t => t.id === stored) ? stored : 'dawn'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Online Store</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Themes</h1>
          <p className="sf-sub mt-0.5">Choose a theme, then customize every section in the visual editor.</p>
        </div>
        <a href="/admin/builder" className="sf-btn sf-btn-primary">Customize theme</a>
      </div>
      <ThemeLibrary activeThemeId={activeThemeId} appearance={appearance} />
    </div>
  )
}
