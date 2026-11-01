// Theme injection — turns saved appearance settings (colors, fonts, radii)
// into CSS custom properties scoped to the storefront, so theme presets and
// the appearance editor apply instantly without touching code.
import { getAppearanceSettings } from '@/lib/settings'

// Fonts loaded from Google Fonts (system fonts skip the link)
const GOOGLE_FONTS = new Set([
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
  'Work Sans', 'Raleway', 'Oswald', 'Playfair Display', 'Merriweather',
  'Bebas Neue', 'Anton', 'Plus Jakarta Sans', 'DM Sans', 'Space Grotesk',
  'Sora', 'Manrope', 'Archivo', 'Rubik', 'Karla', 'Cormorant Garamond', 'Libre Baskerville'
])

const SERIF_FALLBACK = new Set(['Georgia', 'Playfair Display', 'Merriweather', 'Times New Roman', 'Cormorant Garamond', 'Libre Baskerville'])

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
// Mix two colors: t=0 → a, t=1 → b
function mix(a, b, t) {
  const ca = hexToRgb(a) || [0, 0, 0]
  const cb = hexToRgb(b) || [255, 255, 255]
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t
  ])
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex) || [0, 0, 0]
  const f = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrastOn(bg) {
  return luminance(bg) > 0.45 ? '#111111' : '#ffffff'
}

function fontStack(name) {
  if (!name || name === 'system-ui') return 'system-ui, -apple-system, sans-serif'
  const fallback = SERIF_FALLBACK.has(name) ? 'Georgia, serif' : 'sans-serif'
  return `'${name}', ${fallback}`
}

export async function ThemeStyle() {
  let a
  try {
    a = await getAppearanceSettings()
  } catch {
    return null
  }

  const bg = a.backgroundColor || '#ffffff'
  const fg = a.textColor || '#1a1a1a'
  const primary = a.primaryColor || '#1a1a1a'
  const secondary = a.secondaryColor || '#6b7280'
  const accent = a.accentColor || '#d97706'

  const vars = {
    '--background': bg,
    '--foreground': fg,
    '--card': mix(bg, fg, 0.02),
    '--card-foreground': fg,
    '--popover': bg,
    '--popover-foreground': fg,
    '--primary': primary,
    '--primary-foreground': contrastOn(primary),
    '--secondary': mix(secondary, bg, 0.75),
    '--secondary-foreground': contrastOn(secondary),
    '--muted': mix(bg, fg, 0.06),
    '--muted-foreground': mix(fg, bg, 0.45),
    '--accent': mix(accent, bg, 0.85),
    '--accent-foreground': contrastOn(accent),
    '--destructive': '#dc2626',
    '--border': mix(bg, fg, 0.12),
    '--input': mix(bg, fg, 0.16),
    '--ring': primary,
    '--font-display': a.headingFont && a.headingFont !== 'Display' ? fontStack(a.headingFont) : "var(--font-display-original, 'Plus Jakarta Sans'), Inter, sans-serif",
    '--radius': a.cardRadius || '0.75rem'
  }
  // Keep the original Google-font var usable inside --font-display above
  vars['--font-display-original'] = "'Plus Jakarta Sans'"

  const buttonRadius = a.buttonStyle === 'pill' ? '9999px' : a.buttonStyle === 'square' ? '0px' : '0.5rem'

  const css = `
.theme-root {
  ${Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  font-family: ${fontStack(a.fontFamily)};
  --button-radius: ${buttonRadius};
}
.theme-root [data-slot="button"] { border-radius: var(--button-radius); }
.theme-root h1, .theme-root h2, .theme-root h3, .theme-root h4 {
  font-family: var(--font-display);
}
`.trim()

  // Google Fonts <link> for the chosen families
  const families = [a.fontFamily, a.headingFont === 'Display' ? null : a.headingFont]
    .filter(f => f && GOOGLE_FONTS.has(f))
  const fontLink = families.length
    ? `https://fonts.googleapis.com/css2?${families.map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;800`).join('&')}&display=swap`
    : null

  return (
    <>
      {fontLink && <link rel="stylesheet" href={fontLink} />}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  )
}
