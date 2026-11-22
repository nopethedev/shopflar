// Scope per-section custom CSS to its container so admins can write
// `h2 { letter-spacing: 2px; }` and it only affects that section.
// Mirrors Shopify's per-section Custom CSS feature.
export function scopeSectionCss(css, scope) {
  if (!css || typeof css !== 'string') return ''
  // Safety: never allow breaking out of the <style> tag or pulling in
  // external stylesheets / script-capable values
  const clean = css
    .replace(/</g, '')
    .replace(/@import[^;]*;?/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '(')
    .replace(/behavior\s*:/gi, '')
    .slice(0, 6000)
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
