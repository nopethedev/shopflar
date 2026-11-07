// ============================================================
// Theme library — every preset is a full set of storefront tokens.
// Shared by the theme editor (Admin → Online Store → Themes) and the
// legacy appearance editor so a theme can be applied from either place.
// ============================================================

export type ThemeSettings = {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  button_style: 'rounded' | 'pill' | 'square'
  font_family: string
  heading_font: string
  card_radius: string
  container_max_width?: string
}

export type ThemePreset = {
  id: string
  name: string
  desc: string
  category: 'Minimal' | 'Editorial' | 'Bold' | 'Warm' | 'Playful' | 'Dark' | 'Nature' | 'Professional'
  swatch: [string, string, string]
  settings: ThemeSettings
}

export const THEMES: ThemePreset[] = [
  {
    id: 'dawn',
    name: 'Dawn',
    desc: 'The clean, conversion-focused default',
    category: 'Minimal',
    swatch: ['#ffffff', '#121212', '#3b82f6'],
    settings: { primary_color: '#121212', secondary_color: '#6b7280', accent_color: '#3b82f6', background_color: '#ffffff', text_color: '#121212', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Inter', heading_font: 'Plus Jakarta Sans' }
  },
  {
    id: 'mono',
    name: 'Minimal Mono',
    desc: 'Clean black & white, amber accent',
    category: 'Minimal',
    swatch: ['#ffffff', '#1a1a1a', '#d97706'],
    settings: { primary_color: '#1a1a1a', secondary_color: '#6b7280', accent_color: '#d97706', background_color: '#ffffff', text_color: '#1a1a1a', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Inter', heading_font: 'Display' }
  },
  {
    id: 'street',
    name: 'Bold Street',
    desc: 'High-contrast streetwear energy',
    category: 'Bold',
    swatch: ['#ffffff', '#111827', '#dc2626'],
    settings: { primary_color: '#111827', secondary_color: '#4b5563', accent_color: '#dc2626', background_color: '#ffffff', text_color: '#111827', button_style: 'square', card_radius: '0rem', font_family: 'Archivo', heading_font: 'Anton' }
  },
  {
    id: 'pastel',
    name: 'Pastel Soft',
    desc: 'Gentle, friendly and rounded',
    category: 'Playful',
    swatch: ['#fdf2f8', '#9d174d', '#ec4899'],
    settings: { primary_color: '#9d174d', secondary_color: '#f9a8d4', accent_color: '#ec4899', background_color: '#fdf2f8', text_color: '#500724', button_style: 'pill', card_radius: '1.25rem', font_family: 'Nunito', heading_font: 'Poppins' }
  },
  {
    id: 'luxe',
    name: 'Luxe Serif',
    desc: 'Editorial elegance, warm stone',
    category: 'Editorial',
    swatch: ['#fafaf9', '#1c1917', '#b45309'],
    settings: { primary_color: '#1c1917', secondary_color: '#78716c', accent_color: '#b45309', background_color: '#fafaf9', text_color: '#1c1917', button_style: 'rounded', card_radius: '0.25rem', font_family: 'Lato', heading_font: 'Playfair Display' }
  },
  {
    id: 'pop',
    name: 'Playful Pop',
    desc: 'Vivid violet with sunny accents',
    category: 'Playful',
    swatch: ['#ffffff', '#4c1d95', '#f59e0b'],
    settings: { primary_color: '#4c1d95', secondary_color: '#8b5cf6', accent_color: '#f59e0b', background_color: '#ffffff', text_color: '#2e1065', button_style: 'pill', card_radius: '1rem', font_family: 'Rubik', heading_font: 'Sora' }
  },
  {
    id: 'noir',
    name: 'Noir Dark',
    desc: 'Dark mode luxury with cyan pop',
    category: 'Dark',
    swatch: ['#0a0a0a', '#fafafa', '#22d3ee'],
    settings: { primary_color: '#fafafa', secondary_color: '#525252', accent_color: '#22d3ee', background_color: '#0a0a0a', text_color: '#fafafa', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Manrope', heading_font: 'Space Grotesk' }
  },
  {
    id: 'fresh',
    name: 'Fresh Mint',
    desc: 'Modern organic greens',
    category: 'Nature',
    swatch: ['#f7fee7', '#14532d', '#16a34a'],
    settings: { primary_color: '#14532d', secondary_color: '#86efac', accent_color: '#16a34a', background_color: '#f7fee7', text_color: '#052e16', button_style: 'rounded', card_radius: '1rem', font_family: 'Work Sans', heading_font: 'DM Sans' }
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    desc: 'Calm, professional blues',
    category: 'Professional',
    swatch: ['#f0f9ff', '#0c4a6e', '#0ea5e9'],
    settings: { primary_color: '#0c4a6e', secondary_color: '#7dd3fc', accent_color: '#0ea5e9', background_color: '#f0f9ff', text_color: '#082f49', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Work Sans', heading_font: 'Sora' }
  },
  {
    id: 'terra',
    name: 'Terracotta',
    desc: 'Earthy clay and sun-baked tones',
    category: 'Warm',
    swatch: ['#fdf6f0', '#7c2d12', '#ea580c'],
    settings: { primary_color: '#7c2d12', secondary_color: '#c2410c', accent_color: '#ea580c', background_color: '#fdf6f0', text_color: '#431407', button_style: 'rounded', card_radius: '0.5rem', font_family: 'Karla', heading_font: 'Cormorant Garamond' }
  },
  {
    id: 'sand',
    name: 'Warm Sand',
    desc: 'Neutral beige, quiet luxury',
    category: 'Warm',
    swatch: ['#f5f0e6', '#2f2a24', '#a3814e'],
    settings: { primary_color: '#2f2a24', secondary_color: '#8a7f70', accent_color: '#a3814e', background_color: '#f5f0e6', text_color: '#2f2a24', button_style: 'rounded', card_radius: '0.25rem', font_family: 'Lato', heading_font: 'Libre Baskerville' }
  },
  {
    id: 'ink',
    name: 'Ink & Paper',
    desc: 'Newspaper-inspired editorial',
    category: 'Editorial',
    swatch: ['#fbfbf9', '#111111', '#b91c1c'],
    settings: { primary_color: '#111111', secondary_color: '#57534e', accent_color: '#b91c1c', background_color: '#fbfbf9', text_color: '#111111', button_style: 'square', card_radius: '0rem', font_family: 'Libre Baskerville', heading_font: 'Playfair Display' }
  },
  {
    id: 'bloom',
    name: 'Bloom',
    desc: 'Romantic rose with cream',
    category: 'Playful',
    swatch: ['#fff7f8', '#831843', '#f43f5e'],
    settings: { primary_color: '#831843', secondary_color: '#fda4af', accent_color: '#f43f5e', background_color: '#fff7f8', text_color: '#4c0519', button_style: 'pill', card_radius: '1.5rem', font_family: 'Nunito', heading_font: 'Cormorant Garamond' }
  },
  {
    id: 'citrus',
    name: 'Citrus',
    desc: 'Sunny orange, high energy',
    category: 'Bold',
    swatch: ['#fffdf5', '#7c2d12', '#f97316'],
    settings: { primary_color: '#7c2d12', secondary_color: '#fdba74', accent_color: '#f97316', background_color: '#fffdf5', text_color: '#431407', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Rubik', heading_font: 'Archivo' }
  },
  {
    id: 'forest',
    name: 'Forest',
    desc: 'Deep woodland greens',
    category: 'Nature',
    swatch: ['#f6f8f6', '#0f2f24', '#2f855a'],
    settings: { primary_color: '#0f2f24', secondary_color: '#4a7c62', accent_color: '#2f855a', background_color: '#f6f8f6', text_color: '#0b241c', button_style: 'rounded', card_radius: '0.5rem', font_family: 'Work Sans', heading_font: 'Merriweather' }
  },
  {
    id: 'lavender',
    name: 'Lavender Haze',
    desc: 'Soft violet, dreamy calm',
    category: 'Playful',
    swatch: ['#faf7ff', '#4c1d95', '#8b5cf6'],
    settings: { primary_color: '#4c1d95', secondary_color: '#c4b5fd', accent_color: '#8b5cf6', background_color: '#faf7ff', text_color: '#2e1065', button_style: 'pill', card_radius: '1.25rem', font_family: 'Manrope', heading_font: 'Sora' }
  },
  {
    id: 'slate',
    name: 'Slate',
    desc: 'Understated corporate neutral',
    category: 'Professional',
    swatch: ['#ffffff', '#0f172a', '#0284c7'],
    settings: { primary_color: '#0f172a', secondary_color: '#64748b', accent_color: '#0284c7', background_color: '#ffffff', text_color: '#0f172a', button_style: 'rounded', card_radius: '0.5rem', font_family: 'Inter', heading_font: 'Plus Jakarta Sans' }
  },
  {
    id: 'retro',
    name: 'Retro Sunset',
    desc: 'Seventies groove, warm and loud',
    category: 'Bold',
    swatch: ['#fff7ed', '#7c2d12', '#d97706'],
    settings: { primary_color: '#7c2d12', secondary_color: '#b45309', accent_color: '#d97706', background_color: '#fff7ed', text_color: '#431407', button_style: 'pill', card_radius: '2rem', font_family: 'Rubik', heading_font: 'Bebas Neue' }
  },
  {
    id: 'modern-serif',
    name: 'Modern Serif',
    desc: 'Grazia-style fashion magazine',
    category: 'Editorial',
    swatch: ['#ffffff', '#18181b', '#a1a1aa'],
    settings: { primary_color: '#18181b', secondary_color: '#71717a', accent_color: '#52525b', background_color: '#ffffff', text_color: '#18181b', button_style: 'square', card_radius: '0rem', font_family: 'Inter', heading_font: 'Cormorant Garamond' }
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    desc: 'Loud type, hard edges, no fuss',
    category: 'Bold',
    swatch: ['#ffffff', '#000000', '#facc15'],
    settings: { primary_color: '#000000', secondary_color: '#404040', accent_color: '#facc15', background_color: '#ffffff', text_color: '#000000', button_style: 'square', card_radius: '0rem', font_family: 'Archivo', heading_font: 'Anton' }
  },
  {
    id: 'boutique',
    name: 'Boutique',
    desc: 'Cream and gold, small-label charm',
    category: 'Warm',
    swatch: ['#faf7f2', '#3f362c', '#b08d57'],
    settings: { primary_color: '#3f362c', secondary_color: '#8c7d6b', accent_color: '#b08d57', background_color: '#faf7f2', text_color: '#3f362c', button_style: 'rounded', card_radius: '0.25rem', font_family: 'Karla', heading_font: 'Cormorant Garamond' }
  },
  {
    id: 'tech',
    name: 'Tech Minimal',
    desc: 'Sharp monospace-tinged modernism',
    category: 'Minimal',
    swatch: ['#fafafa', '#111827', '#6366f1'],
    settings: { primary_color: '#111827', secondary_color: '#6b7280', accent_color: '#6366f1', background_color: '#fafafa', text_color: '#111827', button_style: 'rounded', card_radius: '0.5rem', font_family: 'Inter', heading_font: 'Space Grotesk' }
  },
  {
    id: 'cafe',
    name: 'Café',
    desc: 'Coffee browns, cosy roastery',
    category: 'Warm',
    swatch: ['#f8f3ec', '#3b2a1d', '#a16207'],
    settings: { primary_color: '#3b2a1d', secondary_color: '#8a6f58', accent_color: '#a16207', background_color: '#f8f3ec', text_color: '#2a1d12', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Karla', heading_font: 'Libre Baskerville' }
  },
  {
    id: 'neon',
    name: 'Neon Night',
    desc: 'Late-night gaming and streetwear',
    category: 'Dark',
    swatch: ['#09090b', '#e4e4e7', '#a3e635'],
    settings: { primary_color: '#e4e4e7', secondary_color: '#71717a', accent_color: '#a3e635', background_color: '#09090b', text_color: '#e4e4e7', button_style: 'rounded', card_radius: '0.75rem', font_family: 'Manrope', heading_font: 'Archivo' }
  }
]

export const THEME_CATEGORIES = ['All', 'Minimal', 'Editorial', 'Bold', 'Warm', 'Playful', 'Dark', 'Nature', 'Professional'] as const

export function getTheme(id: string): ThemePreset | undefined {
  return THEMES.find(t => t.id === id)
}

// Apply a preset from the browser: persists the tokens and remembers which
// theme is active so the library can show a "Current" badge.
export async function applyThemePreset(theme: ThemePreset): Promise<void> {
  const appearance = await fetch('/api/admin/appearance', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(theme.settings)
  })
  if (!appearance.ok) throw new Error('Could not save theme settings')
  await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active_theme: theme.id })
  })
}
