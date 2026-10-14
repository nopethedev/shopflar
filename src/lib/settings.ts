import { db } from './db'

let cache = { ts: 0, data: new Map() }
const TTL = 1000 * 60 // 1 minute

export async function getStoreSettings() {
  const now = Date.now()
  if (now - cache.ts > TTL) {
    const rows = await db.storeSetting.findMany()
    cache = { ts: now, data: new Map(rows.map(r => [r.key, r.value])) }
  }
  const data = cache.data
  const get = (k, d = '') => data.get(k) ?? d
  return {
    storeName: get('store_name', 'Shopflar'),
    storeTitle: get('store_title', 'Shopflar — Modern Apparel'),
    storeDescription: get('store_description', ''),
    storeEmail: get('store_email', ''),
    storePhone: get('store_phone', ''),
    storeAddress: get('store_address', ''),
    currency: get('currency', 'USD'),
    currencySymbol: get('currency_symbol', '$'),
    logoUrl: get('logo_url', ''),
    faviconUrl: get('favicon_url', ''),
    footerText: get('footer_text', '© Shopflar'),
    social: {
      twitter: get('social_twitter', ''),
      instagram: get('social_instagram', ''),
      facebook: get('social_facebook', ''),
      tiktok: get('social_tiktok', '')
    },
    hero: {
      image: get('hero_image', ''),
      title: get('hero_title', ''),
      subtitle: get('hero_subtitle', ''),
      buttonText: get('hero_button_text', 'Shop Now'),
      buttonUrl: get('hero_button_url', '/products')
    },
    sections: {
      featuredTitle: get('featured_section_title', 'Featured Products'),
      featuredSubtitle: get('featured_section_subtitle', ''),
      newArrivalsTitle: get('new_arrivals_title', 'New Arrivals')
    },
    newsletter: {
      title: get('newsletter_prompt_title', get('newsletter_title', 'Get 10% off your first order')),
      subtitle: get('newsletter_prompt_subtitle', get('newsletter_subtitle', 'Subscribe to our newsletter for early access to new drops, exclusive offers, and styling tips.'))
    }
  }
}

let appearanceCache = { ts: 0, data: new Map() }

export async function getAppearanceSettings() {
  const now = Date.now()
  if (now - appearanceCache.ts > TTL) {
    const rows = await db.appearanceSetting.findMany()
    appearanceCache = { ts: now, data: new Map(rows.map(r => [r.key, r.value])) }
  }
  const d = appearanceCache.data
  const get = (k, def) => d.get(k) ?? def
  return {
    primaryColor: get('primary_color', '#1a1a1a'),
    secondaryColor: get('secondary_color', '#6b7280'),
    accentColor: get('accent_color', '#d97706'),
    backgroundColor: get('background_color', '#ffffff'),
    textColor: get('text_color', '#1a1a1a'),
    buttonStyle: get('button_style', 'rounded'),
    fontFamily: get('font_family', 'Inter'),
    headingFont: get('heading_font', 'Display'),
    cardRadius: get('card_radius', '0.75rem'),
    containerMaxWidth: get('container_max_width', '1280px')
  }
}

export function formatPrice(amount, currency = 'USD', symbol = '$') {
  const n = Number(amount || 0)
  return `${symbol}${n.toFixed(2)}`
}

export async function getAppUrl() {
  // Read from DB (so admin panel can change it) — fall back to env, then to request origin
  const dbUrl = await getStoreSettingValue('NEXT_PUBLIC_APP_URL') || await getStoreSettingValue('APP_URL')
  if (dbUrl) return dbUrl.replace(/\/$/, '')
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  return 'http://localhost:3000'
}

async function getStoreSettingValue(key) {
  try {
    const row = await db.storeSetting.findUnique({ where: { key } })
    return row?.value || ''
  } catch {
    return ''
  }
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateOrderNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `#${String(Date.now()).slice(-5)}${n}`
}

// ============ Business details (optional) ============
export async function getBusinessDetails() {
  const get = async (k, d = '') => {
    const v = await getStoreSettingValue(k)
    return v || d
  }
  return {
    businessName: await get('business_name', ''),
    legalName: await get('business_legal_name', ''),
    registrationNumber: await get('business_registration_number', ''),
    vatNumber: await get('business_vat_number', ''),
    addressLine1: await get('business_address_line1', ''),
    addressLine2: await get('business_address_line2', ''),
    city: await get('business_city', ''),
    state: await get('business_state', ''),
    postalCode: await get('business_postal_code', ''),
    country: await get('business_country', ''),
    phone: await get('business_phone', ''),
    email: await get('store_email', ''),
    website: await getAppUrl(),
    // EU compliance fields
    legalForm: await get('business_legal_form', ''),
    shareCapital: await get('business_share_capital', ''),
    representatives: await get('business_representatives', ''),
    supervisingAuthority: await get('business_supervising_authority', ''),
    responsiblePersonName: await get('business_responsible_person_name', ''),
    responsiblePersonAddress: await get('business_responsible_person_address', ''),
    responsiblePersonEmail: await get('business_responsible_person_email', ''),
    responsiblePersonPhone: await get('business_responsible_person_phone', ''),
    lucidNumber: await get('business_lucid_number', 'DE4139628009499'),
    ossNumber: await get('business_oss_number', ''),
    iosNumber: await get('business_ioss_number', '')
  }
}

export async function getLegalContent(key, defaultContent = '') {
  // Read policy/legal content stored in DB by admin
  const v = await getStoreSettingValue(`legal_${key}`)
  return v || defaultContent
}

export async function getPlugins() {
  try {
    const rows = await db.plugin.findMany({ orderBy: { slug: 'asc' } })
    return rows
  } catch {
    return []
  }
}

export async function isPluginEnabled(slug) {
  try {
    const row = await db.plugin.findUnique({ where: { slug } })
    return row?.enabled || false
  } catch {
    return false
  }
}

export async function getCustomNavPages() {
  try {
    return await db.customPage.findMany({
      where: { status: 'PUBLISHED', showInNav: true },
      orderBy: { sortOrder: 'asc' }
    })
  } catch {
    return []
  }
}

// ============ Store Mode: normal | maintenance | prelaunch ============
export async function getStoreMode() {
  const get = async (settingKey, defaultValue) => {
    try {
      const row = await db.storeSetting.findUnique({ where: { key: settingKey } })
      return row?.value || defaultValue
    } catch { return defaultValue }
  }

  const maintenanceEnabled = await get('maintenance_enabled', 'false')
  const prelaunchEnabled = await get('prelaunch_enabled', 'false')

  if (maintenanceEnabled === 'true') {
    return {
      mode: 'maintenance',
      message: await get('maintenance_message', 'We\'ll be back shortly. Thanks for your patience.'),
      title: await get('maintenance_title', 'Under Maintenance'),
      image: await get('maintenance_image', ''),
      launchDate: null
    }
  }

  if (prelaunchEnabled === 'true') {
    const launchDate = await get('prelaunch_launch_date', '')
    return {
      mode: 'prelaunch',
      title: await get('prelaunch_title', 'Something Amazing Is Coming'),
      subtitle: await get('prelaunch_subtitle', 'We\'re putting the finishing touches on our store. Be the first to know when we launch.'),
      image: await get('prelaunch_image', ''),
      launchDate: launchDate || null,
      launchDateObj: launchDate ? new Date(launchDate) : null
    }
  }

  return { mode: 'normal' }
}

// ============ Sale Limit ============
export async function getSaleLimitStatus() {
  const get = async (settingKey, defaultValue) => {
    try {
      const row = await db.storeSetting.findUnique({ where: { key: settingKey } })
      return row?.value || defaultValue
    } catch { return defaultValue }
  }

  const enabled = await get('sale_limit_enabled', 'false')
  const limit = parseFloat(await get('sale_limit_amount', '0')) || 0
  const warningThreshold = parseFloat(await get('sale_limit_warning', '90')) || 90

  if (enabled !== 'true' || limit <= 0) {
    return { enabled: false, limit: 0, total: 0, remaining: 0, percentage: 0, warning: false, exceeded: false }
  }

  // Calculate total sales from paid orders
  const result = await db.order.aggregate({
    _sum: { total: true },
    where: {
      status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
    }
  }).catch(() => ({ _sum: { total: 0 } }))

  const total = result._sum?.total || 0
  const remaining = Math.max(0, limit - total)
  const percentage = Math.min(100, (total / limit) * 100)
  const warning = percentage >= warningThreshold
  const exceeded = total >= limit

  return { enabled: true, limit, total, remaining, percentage, warning, exceeded }
}
