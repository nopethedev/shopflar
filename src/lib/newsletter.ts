// Newsletter email rendering — pure functions, safe for client & server.
// Produces bulletproof, table-based email HTML that renders consistently
// across Gmail, Outlook, Apple Mail and mobile clients.
//
// Two campaign modes:
//   blocks — stack of editable blocks (heading / text / image / button / divider / spacer)
//   image  — one full-width uploaded image that links to the store when clicked

export const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: 'heading' },
  { type: 'text', label: 'Text', icon: 'text' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'button', label: 'Button', icon: 'button' },
  { type: 'divider', label: 'Divider', icon: 'divider' },
  { type: 'spacer', label: 'Spacer', icon: 'spacer' }
]

export function defaultBlock(type) {
  switch (type) {
    case 'heading': return { type: 'heading', text: 'Section heading', size: 'large', align: 'left', color: '' }
    case 'text': return { type: 'text', html: '<p>Write something worth reading — a product story, a promo, a launch date.</p>', align: 'left' }
    case 'image': return { type: 'image', url: '', alt: '', link: '', rounded: true, width: 100 }
    case 'button': return { type: 'button', text: 'Shop now', url: '/products', align: 'left', color: '', textColor: '#ffffff', pill: false }
    case 'divider': return { type: 'divider', color: '#e5e5e5', padding: 16 }
    case 'spacer': return { type: 'spacer', height: 24 }
    default: return { type }
  }
}

// Escape user text going into HTML attributes / plain text nodes
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function absUrl(url, storeUrl) {
  if (!url) return ''
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  const base = (storeUrl || '').replace(/\/$/, '')
  if (!base) return url
  return url.startsWith('/') ? base + url : `${base}/${url}`
}

const HEADING_SIZES = { small: 20, medium: 26, large: 32, xlarge: 40 }

function renderBlock(block, opts) {
  const { accentColor, storeUrl } = opts
  switch (block.type) {
    case 'heading': {
      const size = HEADING_SIZES[block.size] || 32
      const color = block.color || '#111111'
      const align = block.align || 'left'
      return `<tr><td style="padding:6px 0;" align="${align}">
        <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:${size}px;line-height:1.2;font-weight:700;color:${esc(color)};text-align:${align};">${esc(block.text || '')}</h2>
      </td></tr>`
    }
    case 'text': {
      const align = block.align || 'left'
      return `<tr><td style="padding:6px 0;" align="${align}">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3f3f3f;text-align:${align};">${block.html || ''}</div>
      </td></tr>`
    }
    case 'image': {
      if (!block.url) return ''
      const src = absUrl(block.url, storeUrl)
      const href = absUrl(block.link, storeUrl)
      const radius = block.rounded ? '8px' : '0'
      const widthPct = Math.min(100, Math.max(20, parseInt(block.width) || 100))
      const img = `<img src="${esc(src)}" alt="${esc(block.alt || '')}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;border-radius:${radius};" />`
      const wrapped = href ? `<a href="${esc(href)}" target="_blank" style="text-decoration:none;">${img}</a>` : img
      return `<tr><td style="padding:8px 0;" align="center"><div style="width:${widthPct}%;margin:0 ${widthPct < 100 ? 'auto' : '0'};">${wrapped}</div></td></tr>`
    }
    case 'button': {
      if (!block.text || !block.url) return ''
      const href = absUrl(block.url, storeUrl)
      const bg = block.color || accentColor
      const color = block.textColor || '#ffffff'
      const radius = block.pill ? '999px' : '8px'
      const align = block.align || 'left'
      return `<tr><td style="padding:10px 0;" align="${align}">
        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td align="center" bgcolor="${esc(bg)}" style="background:${esc(bg)};border-radius:${radius};">
          <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${esc(color)};text-decoration:none;border-radius:${radius};">${esc(block.text)}</a>
        </td></tr></table>
      </td></tr>`
    }
    case 'divider': {
      const pad = Math.max(0, Math.min(48, parseInt(block.padding) || 16))
      return `<tr><td style="padding:${pad}px 0;"><hr style="border:none;border-top:1px solid ${esc(block.color || '#e5e5e5')};margin:0;" /></td></tr>`
    }
    case 'spacer': {
      const h = Math.max(4, Math.min(120, parseInt(block.height) || 24))
      return `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`
    }
    default:
      return ''
  }
}

// Main entry — build the full email HTML for a campaign.
// opts: { storeName, logoUrl, storeUrl, unsubscribeUrl, addressText }
export function renderNewsletterEmail(campaign, opts = {}) {
  const { storeName = 'Store', logoUrl = '', storeUrl = '', unsubscribeUrl = '', addressText = '' } = opts
  const accentColor = campaign.accentColor || '#1a1a1a'
  const storeHref = absUrl('/', storeUrl)
  const preheaderHtml = campaign.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(campaign.preheader)}</div>`
    : ''

  // Body content: full-image mode OR block stack
  let bodyRows = ''
  if (campaign.mode === 'image') {
    if (campaign.imageUrl) {
      const src = absUrl(campaign.imageUrl, storeUrl)
      const href = absUrl(campaign.clickUrl || '/', storeUrl)
      bodyRows = `<tr><td style="padding:0;" align="center">
        <a href="${esc(href)}" target="_blank" style="text-decoration:none;display:block;">
          <img src="${esc(src)}" alt="${esc(campaign.imageAlt || campaign.subject || '')}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
        </a>
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:14px 24px 20px;text-align:center;">
          <a href="${esc(href)}" target="_blank" style="color:#888888;font-size:13px;text-decoration:none;">Tap the image to visit our store &rarr;</a>
        </div>
      </td></tr>`
    } else {
      bodyRows = `<tr><td style="padding:40px 24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#999999;font-size:14px;">No image uploaded yet.</td></tr>`
    }
  } else {
    let blocks = campaign.blocks
    if (typeof blocks === 'string') { try { blocks = JSON.parse(blocks) } catch { blocks = [] } }
    if (!Array.isArray(blocks)) blocks = []
    const inner = blocks.map(b => renderBlock(b, { accentColor, storeUrl })).join('\n')
    bodyRows = `<tr><td style="padding:28px 32px 12px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${inner}</table>
    </td></tr>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${esc(campaign.subject || '')}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
${preheaderHtml}
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">
  <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;border-collapse:collapse;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr><td align="center" style="padding:26px 32px 20px;border-bottom:1px solid #f0f0f0;">
      ${logoUrl
        ? `<a href="${esc(storeHref)}" target="_blank" style="text-decoration:none;"><img src="${esc(absUrl(logoUrl, storeUrl))}" alt="${esc(storeName)}" width="140" style="display:block;margin:0 auto;max-height:56px;width:auto;border:0;" /></a>`
        : `<a href="${esc(storeHref)}" target="_blank" style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#111111;text-decoration:none;letter-spacing:-0.5px;">${esc(storeName)}</a>`}
    </td></tr>
    ${bodyRows}
    <!-- Footer -->
    <tr><td style="padding:24px 32px 28px;border-top:1px solid #f0f0f0;background:#fafafa;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tr><td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#999999;">
          ${addressText ? `<div style="margin-bottom:8px;">${esc(addressText)}</div>` : ''}
          <a href="${esc(unsubscribeUrl || '#')}" target="_blank" style="color:#999999;text-decoration:underline;">Unsubscribe</a>
          <span style="color:#dddddd;">&nbsp;·&nbsp;</span>
          <a href="${esc(storeHref)}" target="_blank" style="color:#999999;text-decoration:none;">Visit store</a>
          <div style="margin-top:8px;">&copy; ${new Date().getFullYear()} ${esc(storeName)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}
