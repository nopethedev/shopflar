// Scope per-section custom CSS to its container so admins can write
// `h2 { letter-spacing: 2px; }` and it only affects that section.
// Mirrors Shopify's per-section Custom CSS feature.
export function scopeSectionCss(css, scope) {
  if (!css || typeof css !== 'string') return ''
  // Safety: never allow breaking out of the <style> tag
  const clean = css.replace(/</g, '').slice(0, 4000)
  return clean.replace(/(^|})\s*([^@{}]+)\s*\{/g, (m, brace, selector) => {
    const scoped = selector
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => `${scope} ${s}`)
      .join(', ')
    return `${brace}${scoped}{`
  })
}
