// Shared section style helpers — safe for client & server (no db imports).
// Used by the storefront renderer, the slideshow/countdown client components
// and the page builder preview so they all behave identically.

// 9-way content position (Shopify-style "Position: Bottom center") with
// backward compatibility for the old left/center/right values
export function contentPositionClasses(value) {
  const legacy = { left: 'middle-left', center: 'middle-center', right: 'middle-right' }
  const pos = legacy[value] || value || 'middle-left'
  const [vertical = 'middle', horizontal = 'left'] = String(pos).split('-')
  const justify = horizontal === 'center' ? 'justify-center' : horizontal === 'right' ? 'justify-end' : 'justify-start'
  const align = vertical === 'top' ? 'items-start' : vertical === 'bottom' ? 'items-end' : 'items-center'
  const textAlign = horizontal === 'center' ? 'text-center' : horizontal === 'right' ? 'text-right' : 'text-left'
  return { justify, align, textAlign, className: `${justify} ${align} ${textAlign}` }
}

// Overlay style from the opacity slider (0-90). Returns null when the slider
// was never used, so callers can fall back to the classic gradient.
export function overlayStyleFor(config) {
  const opacity = config && config.overlayOpacity
  if (opacity === undefined || opacity === null || opacity === '') return null
  return { background: `rgba(0,0,0,${Math.min(90, Math.max(0, parseInt(opacity) || 0)) / 100})` }
}
