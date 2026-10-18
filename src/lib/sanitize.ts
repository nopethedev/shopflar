// HTML sanitization — strips dangerous tags/attributes while preserving safe formatting
// Used for user-provided HTML in section configs (text blocks, custom HTML, etc.)

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img', 'blockquote', 'pre', 'code',
  'span', 'div', 'section', 'article',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'figure', 'figcaption'
])

const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height',
  'class', 'style', 'id', 'target', 'rel',
  'colspan', 'rowspan', 'loading'
])

const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style',
  'text-align', 'text-decoration', 'margin', 'margin-top', 'margin-bottom',
  'margin-left', 'margin-right', 'padding', 'padding-top', 'padding-bottom',
  'padding-left', 'padding-right', 'border', 'border-radius',
  'width', 'height', 'max-width', 'max-height', 'display', 'gap'
])

// URLs must be http/https/mailto/tel or relative paths
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed
  // Allow protocol-relative URLs
  if (/^\/\//.test(trimmed)) return trimmed
  return ''
}

function sanitizeStyle(styleStr) {
  if (!styleStr) return ''
  return styleStr
    .split(';')
    .map(rule => {
      const [prop, ...valParts] = rule.split(':')
      const p = prop?.trim()?.toLowerCase()
      const v = valParts.join(':').trim()
      if (p && ALLOWED_STYLE_PROPS.has(p) && v) {
        // Block url() in styles — prevents CSS injection
        if (/url\s*\(/i.test(v)) return ''
        return `${p}: ${v}`
      }
      return ''
    })
    .filter(Boolean)
    .join('; ')
}

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return ''

  // Quick check — if no tags, return as-is
  if (!html.includes('<')) return html

  try {
    // Use DOMParser if available (browser), otherwise regex fallback (server)
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      sanitizeNode(doc.body)
      return doc.body.innerHTML
    } else {
      // Server-side: regex-based sanitization (less precise but blocks the dangerous stuff)
      return sanitizeHtmlServerSide(html)
    }
  } catch {
    // If parsing fails, strip all tags as a fallback
    return html.replace(/<[^>]*>/g, '')
  }
}

function sanitizeNode(node) {
  const children = [...node.childNodes]
  for (const child of children) {
    if (child.nodeType === 1) { // Element node
      const tag = child.tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        // Replace disallowed tag with its text content
        const text = document.createTextNode(child.textContent || '')
        child.parentNode.replaceChild(text, child)
        continue
      }
      // Sanitize attributes
      const attrs = [...child.attributes]
      for (const attr of attrs) {
        const name = attr.name.toLowerCase()
        if (!ALLOWED_ATTRS.has(name)) {
          child.removeAttribute(attr.name)
        } else if (name === 'href' || name === 'src') {
          const safe = sanitizeUrl(attr.value)
          if (!safe) {
            child.removeAttribute(attr.name)
          } else {
            child.setAttribute(name, safe)
          }
        } else if (name === 'style') {
          const safe = sanitizeStyle(attr.value)
          if (!safe) {
            child.removeAttribute(name)
          } else {
            child.setAttribute(name, safe)
          }
        } else if (name === 'target') {
          // Force rel="noopener noreferrer" when target=_blank
          if (attr.value === '_blank') {
            child.setAttribute('rel', 'noopener noreferrer')
          }
        }
      }
      // Remove event handler attributes (onclick, onload, etc.)
      const eventAttrs = [...child.attributes].filter(a => a.name.startsWith('on'))
      for (const attr of eventAttrs) {
        child.removeAttribute(attr.name)
      }
      sanitizeNode(child)
    } else if (child.nodeType === 3) { // Text node — safe
      // Keep as-is
    }
  }
}

function sanitizeHtmlServerSide(html) {
  // Remove script tags and their content
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove style tags and their content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  // Remove event handler attributes (onclick, onload, onerror, etc.)
  result = result.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
  result = result.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
  // Remove javascript: URLs
  result = result.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
  result = result.replace(/src\s*=\s*"javascript:[^"]*"/gi, '')
  // Remove data: URLs in src (can be used for XSS)
  result = result.replace(/src\s*=\s*"data:[^"]*"/gi, (match) => {
    // Allow data:image/ URLs (safe for images)
    if (/data:image\//i.test(match)) return match
    return ''
  })
  // Remove iframe, object, embed, applet tags
  result = result.replace(/<\/?(iframe|object|embed|applet|form|input|textarea|button|select|option)[^>]*>/gi, '')
  return result
}

// Sanitize a section config object — recursively sanitize any HTML fields
export function sanitizeSectionConfig(config) {
  if (!config || typeof config !== 'object') return config
  const sanitized = { ...config }
  const htmlFields = ['body', 'html', 'content', 'text']
  for (const field of htmlFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field])
    }
  }
  // Sanitize URL fields
  const urlFields = ['image', 'url', 'link', 'buttonUrl', 'videoUrl']
  for (const field of urlFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeUrl(sanitized[field])
    }
  }
  return sanitized
}
