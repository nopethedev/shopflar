// MCP tool catalog for Shopflar. Each tool = zod input schema + handler.
// Read tools are available to every key; write tools need a `write` key.
// Nothing here can send email, move money or delete data irreversibly:
// campaigns are created as drafts, products are archived not deleted, and
// page-builder edits stay as drafts until publish_page is called.
import { z } from 'zod'
import { db } from '@/lib/db'
import { like } from '@/lib/db'
import { slugify } from '@/lib/settings'
import { logEvent } from '@/lib/logs'
import { sanitizeHtml, sanitizeSectionConfig } from '@/lib/sanitize'
import { SECTION_CATALOG, defaultConfig, isSectionType } from '@/lib/section-catalog'
import { applySectionAction, getEditorSections, pageWhere, withDraft } from '@/lib/page-sections'
import type { VerifiedKey } from './keys'

export type ToolCtx = { key: VerifiedKey }
export type Tool = {
  name: string
  description: string
  write: boolean
  schema: z.ZodObject<any>
  handler: (args: any, ctx: ToolCtx) => Promise<unknown>
}

class ToolError extends Error {}
const fail = (msg: string): never => { throw new ToolError(msg) }

const audit = (ctx: ToolCtx, action: string, entity: string, entityId: string | null, metadata: Record<string, unknown>) =>
  logEvent(action as any, { actorEmail: `mcp:${ctx.key.name}`, entity, entityId, metadata, notify: false })

// ───────────── helpers ─────────────
const money = z.number().min(0).max(10_000_000)
const productStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

async function resolvePage(page: string | undefined) {
  if (!page || page === 'home') return { pageType: 'home', pageId: null as string | null, label: 'Home page' }
  const row = await db.customPage.findFirst({ where: { OR: [{ id: page }, { slug: page }] } })
  if (!row) return fail(`No page "${page}". Use "home" or the slug/id of a custom page (see list_pages).`)
  return { pageType: 'custom', pageId: row.id, label: row.title }
}

async function categoryIdsFrom(slugs?: string[]) {
  if (!slugs?.length) return undefined
  const cats = await db.category.findMany({ where: { OR: [{ slug: { in: slugs } }, { id: { in: slugs } }] } })
  const missing = slugs.filter(s => !cats.some(c => c.slug === s || c.id === s))
  if (missing.length) fail(`Unknown categories: ${missing.join(', ')}. Create them first with create_category.`)
  return cats.map(c => c.id)
}

async function uniqueSlug(model: 'product' | 'customPage' | 'category', base: string) {
  let slug = slugify(base) || 'item'
  for (let i = 0; i < 20; i++) {
    const exists = await (db as any)[model].findUnique({ where: { slug } })
    if (!exists) return slug
    slug = `${slugify(base) || 'item'}-${Math.random().toString(36).slice(2, 6)}`
  }
  return slug
}

const productView = (p: any) => ({
  id: p.id, name: p.name, slug: p.slug, status: p.status, featured: p.featured,
  price: p.price, compareAtPrice: p.compareAtPrice, sku: p.sku, inventoryQty: p.inventoryQty,
  shortDescription: p.shortDescription, description: p.description,
  categories: p.categories?.map((c: any) => c.category?.slug),
  tags: p.tags?.map((t: any) => t.tag),
  images: p.images?.map((i: any) => i.url),
  variants: p.variants?.map((v: any) => ({ id: v.id, name: v.name, sku: v.sku, price: v.price, inventoryQty: v.inventoryQty })),
  url: `/products/${p.slug}`
})
const productInclude = { categories: { include: { category: true } }, tags: true, images: { orderBy: { sortOrder: 'asc' as const } }, variants: true }

// ───────────── tools ─────────────
export const TOOLS: Tool[] = [
  // ===== Read =====
  {
    name: 'store_overview', write: false,
    description: 'Snapshot of the store: product/order/customer counts, revenue over the last 30 days, low-stock products and the active theme. Call this first to get oriented.',
    schema: z.object({}),
    async handler() {
      const since = new Date(Date.now() - 30 * 86400000)
      const [products, published, orders, customers, subscribers, paid, lowStock, theme, name] = await Promise.all([
        db.product.count(), db.product.count({ where: { status: 'PUBLISHED' } }), db.order.count(),
        db.user.count({ where: { role: 'CUSTOMER' } }), db.newsletterSubscriber.count(),
        db.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: since } }, _sum: { total: true }, _count: true }),
        db.product.findMany({ where: { status: 'PUBLISHED', trackInventory: true, inventoryQty: { lte: 5 } }, select: { name: true, slug: true, inventoryQty: true }, take: 10 }),
        db.storeSetting.findUnique({ where: { key: 'active_theme' } }),
        db.storeSetting.findFirst({ where: { key: { in: ['store_name', 'storeName'] } } })
      ])
      return {
        store: name?.value || 'Shopflar store',
        products: { total: products, published }, orders, customers, newsletterSubscribers: subscribers,
        last30Days: { paidOrders: paid._count, revenue: paid._sum.total || 0 },
        lowStock, activeTheme: theme?.value || 'dawn'
      }
    }
  },
  {
    name: 'list_products', write: false,
    description: 'Search and list products. Returns up to `limit` (max 50) products with price, stock, status and categories.',
    schema: z.object({
      search: z.string().optional().describe('Matches name, SKU and description'),
      status: productStatus.optional(),
      category: z.string().optional().describe('Category slug'),
      limit: z.number().int().min(1).max(50).default(20)
    }),
    async handler(a) {
      const where: any = {}
      if (a.status) where.status = a.status
      if (a.category) where.categories = { some: { category: { slug: a.category } } }
      if (a.search) where.OR = [{ name: like(a.search) }, { sku: like(a.search) }, { description: like(a.search) }]
      const rows = await db.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, take: a.limit })
      return { count: rows.length, products: rows.map(productView) }
    }
  },
  {
    name: 'get_product', write: false,
    description: 'Full details of one product by id or slug.',
    schema: z.object({ product: z.string().describe('Product id or slug') }),
    async handler(a) {
      const p = await db.product.findFirst({ where: { OR: [{ id: a.product }, { slug: a.product }] }, include: productInclude })
      return p ? productView(p) : fail(`Product "${a.product}" not found`)
    }
  },
  {
    name: 'list_categories', write: false,
    description: 'All product categories with slugs and product counts.',
    schema: z.object({}),
    async handler() {
      const cats = await db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } })
      return cats.map(c => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId, visible: c.isVisible, products: c._count.products }))
    }
  },
  {
    name: 'list_orders', write: false,
    description: 'Recent orders, newest first. Customer addresses are omitted; use get_order for details.',
    schema: z.object({
      status: z.enum(['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED']).optional(),
      limit: z.number().int().min(1).max(50).default(20)
    }),
    async handler(a) {
      const rows = await db.order.findMany({ where: a.status ? { status: a.status } : {}, orderBy: { createdAt: 'desc' }, take: a.limit })
      return rows.map(o => ({ id: o.id, number: o.orderNumber, status: o.status, payment: o.paymentStatus, total: o.total, currency: o.currency, email: o.email, createdAt: o.createdAt }))
    }
  },
  {
    name: 'get_order', write: false,
    description: 'One order with its line items and tracking details (by id or order number).',
    schema: z.object({ order: z.string().describe('Order id or order number') }),
    async handler(a) {
      const o = await db.order.findFirst({ where: { OR: [{ id: a.order }, { orderNumber: a.order }] }, include: { items: true } })
      if (!o) return fail(`Order "${a.order}" not found`)
      return {
        id: o.id, number: o.orderNumber, status: o.status, payment: o.paymentStatus, paymentProvider: o.paymentProvider,
        total: o.total, subtotal: o.subtotal, shipping: o.shippingTotal, tax: o.taxTotal, discount: o.discountTotal, discountCode: o.discountCode,
        email: o.email, tracking: { number: o.trackingNumber, carrier: o.trackingCarrier, url: o.trackingUrl },
        items: o.items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, sku: i.sku })), createdAt: o.createdAt
      }
    }
  },
  {
    name: 'list_discounts', write: false,
    description: 'Discount codes with usage and status.',
    schema: z.object({ activeOnly: z.boolean().default(false) }),
    async handler(a) {
      const rows = await db.discount.findMany({ where: a.activeOnly ? { isActive: true } : {}, orderBy: { createdAt: 'desc' }, take: 100 })
      return rows.map(d => ({ id: d.id, code: d.code, type: d.type, value: d.value, minOrderAmount: d.minOrderAmount, used: d.usedCount, limit: d.usageLimit, active: d.isActive, startsAt: d.startDate, endsAt: d.endDate }))
    }
  },
  {
    name: 'list_pages', write: false,
    description: 'Custom pages (About, FAQ, landing pages…) with slugs and status.',
    schema: z.object({}),
    async handler() {
      const rows = await db.customPage.findMany({ orderBy: { title: 'asc' } })
      return rows.map(p => ({ id: p.id, title: p.title, slug: p.slug, status: p.status, inNav: p.showInNav, url: `/pages/${p.slug}` }))
    }
  },
  {
    name: 'list_campaigns', write: false,
    description: 'Newsletter campaigns with their status and delivery counts.',
    schema: z.object({}),
    async handler() {
      const rows = await db.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
      return rows.map(c => ({ id: c.id, subject: c.subject, status: c.status, recipients: c.totalRecipients, sent: c.sentCount, failed: c.failedCount, createdAt: c.createdAt }))
    }
  },
  {
    name: 'list_section_types', write: false,
    description: 'The building blocks of the theme editor (hero, product-grid, features, gallery…). Returns each type with a description and its default config — use these as the starting point for add_section.',
    schema: z.object({ type: z.string().optional().describe('Return only this type, including its full default config') }),
    async handler(a) {
      if (a.type) {
        const meta = SECTION_CATALOG.find(s => s.type === a.type)
        return meta ? { ...meta, defaultConfig: defaultConfig(a.type) } : fail(`Unknown section type "${a.type}"`)
      }
      return SECTION_CATALOG.map(({ type, label, group, description }) => ({ type, label, group, description }))
    }
  },
  {
    name: 'get_page_layout', write: false,
    description: 'Current (draft) section layout of the home page or a custom page, in order, with each section\'s config.',
    schema: z.object({ page: z.string().default('home').describe('"home" or a custom page slug/id') }),
    async handler(a) {
      const p = await resolvePage(a.page)
      const sections = await getEditorSections(p.pageType, p.pageId)
      return { page: p.label, sections: sections.map(s => ({ id: s.id, type: s.sectionType, visible: s.isVisible, config: s.config })) }
    }
  },

  // ===== Write =====
  {
    name: 'create_category', write: true,
    description: 'Create a product category.',
    schema: z.object({ name: z.string().min(1).max(100), description: z.string().max(1000).optional(), imageUrl: z.string().url().optional(), parentSlug: z.string().optional() }),
    async handler(a, ctx) {
      const parent = a.parentSlug ? await db.category.findUnique({ where: { slug: a.parentSlug } }) : null
      if (a.parentSlug && !parent) fail(`Parent category "${a.parentSlug}" not found`)
      const c = await db.category.create({ data: { name: a.name, slug: await uniqueSlug('category', a.name), description: a.description || null, imageUrl: a.imageUrl || null, parentId: parent?.id || null } })
      await audit(ctx, 'category.created', 'category', c.id, { name: c.name })
      return { id: c.id, name: c.name, slug: c.slug }
    }
  },
  {
    name: 'create_product', write: true,
    description: 'Create a product. It is saved as a DRAFT by default so you can review it in the admin; pass status "PUBLISHED" to put it live. Image URLs must be publicly reachable. Categories are referenced by slug (see list_categories).',
    schema: z.object({
      name: z.string().min(1).max(200),
      price: money,
      description: z.string().max(20000).optional().describe('HTML or plain text'),
      shortDescription: z.string().max(500).optional(),
      compareAtPrice: money.optional().describe('Original price — shows a sale badge when higher than price'),
      sku: z.string().max(80).optional(),
      inventoryQty: z.number().int().min(0).max(1_000_000).default(0),
      status: productStatus.default('DRAFT'),
      featured: z.boolean().default(false),
      categories: z.array(z.string()).max(20).optional().describe('Category slugs'),
      tags: z.array(z.string().max(40)).max(30).optional(),
      images: z.array(z.string().url()).max(12).optional(),
      variants: z.array(z.object({ name: z.string(), sku: z.string().optional(), price: money.optional(), inventoryQty: z.number().int().min(0).default(0) })).max(100).optional()
    }),
    async handler(a, ctx) {
      const categoryIds = await categoryIdsFrom(a.categories)
      const p = await db.product.create({
        data: {
          name: a.name, slug: await uniqueSlug('product', a.name), price: a.price,
          description: a.description ? sanitizeHtml(a.description) : null, shortDescription: a.shortDescription || null,
          compareAtPrice: a.compareAtPrice ?? null, sku: a.sku || null, inventoryQty: a.inventoryQty, isOutOfStock: a.inventoryQty <= 0,
          status: a.status, featured: a.featured, publishedAt: a.status === 'PUBLISHED' ? new Date() : null,
          categories: categoryIds ? { create: categoryIds.map(categoryId => ({ categoryId })) } : undefined,
          tags: a.tags?.length ? { create: a.tags.map((tag: string) => ({ tag })) } : undefined,
          images: a.images?.length ? { create: a.images.map((url: string, i: number) => ({ url, sortOrder: i })) } : undefined,
          variants: a.variants?.length ? { create: a.variants.map((v: any) => ({ name: v.name, options: JSON.stringify({ option: v.name }), sku: v.sku || null, price: v.price ?? null, inventoryQty: v.inventoryQty })) } : undefined
        },
        include: productInclude
      })
      await audit(ctx, 'product.created', 'product', p.id, { name: p.name, status: p.status })
      return { created: true, ...productView(p), note: p.status === 'DRAFT' ? 'Saved as a draft — publish it with update_product {status:"PUBLISHED"} when ready.' : undefined }
    }
  },
  {
    name: 'update_product', write: true,
    description: 'Update fields of an existing product (any subset). `images` and `tags`, when given, replace the existing lists.',
    schema: z.object({
      product: z.string().describe('Product id or slug'),
      name: z.string().min(1).max(200).optional(), price: money.optional(), compareAtPrice: money.nullable().optional(),
      description: z.string().max(20000).optional(), shortDescription: z.string().max(500).optional(), sku: z.string().max(80).optional(),
      inventoryQty: z.number().int().min(0).max(1_000_000).optional(), status: productStatus.optional(), featured: z.boolean().optional(),
      categories: z.array(z.string()).optional(), tags: z.array(z.string().max(40)).optional(), images: z.array(z.string().url()).max(12).optional()
    }),
    async handler(a, ctx) {
      const existing = await db.product.findFirst({ where: { OR: [{ id: a.product }, { slug: a.product }] } })
      if (!existing) return fail(`Product "${a.product}" not found`)
      const categoryIds = await categoryIdsFrom(a.categories)
      const data: any = {}
      for (const k of ['name', 'price', 'compareAtPrice', 'sku', 'shortDescription', 'featured', 'status'] as const) if (a[k] !== undefined) data[k] = a[k]
      if (a.description !== undefined) data.description = sanitizeHtml(a.description)
      if (a.inventoryQty !== undefined) { data.inventoryQty = a.inventoryQty; data.isOutOfStock = a.inventoryQty <= 0 }
      if (a.status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date()
      if (categoryIds) data.categories = { deleteMany: {}, create: categoryIds.map(categoryId => ({ categoryId })) }
      if (a.tags) data.tags = { deleteMany: {}, create: a.tags.map((tag: string) => ({ tag })) }
      if (a.images) data.images = { deleteMany: {}, create: a.images.map((url: string, i: number) => ({ url, sortOrder: i })) }
      const p = await db.product.update({ where: { id: existing.id }, data, include: productInclude })
      await audit(ctx, 'product.updated', 'product', p.id, { name: p.name, fields: Object.keys(data) })
      return { updated: true, ...productView(p) }
    }
  },
  {
    name: 'archive_product', write: true,
    description: 'Remove a product from the storefront by archiving it (reversible — set status back to PUBLISHED with update_product). Products are never hard-deleted through MCP.',
    schema: z.object({ product: z.string().describe('Product id or slug') }),
    async handler(a, ctx) {
      const existing = await db.product.findFirst({ where: { OR: [{ id: a.product }, { slug: a.product }] } })
      if (!existing) return fail(`Product "${a.product}" not found`)
      await db.product.update({ where: { id: existing.id }, data: { status: 'ARCHIVED' } })
      await audit(ctx, 'product.updated', 'product', existing.id, { name: existing.name, status: 'ARCHIVED' })
      return { archived: true, name: existing.name }
    }
  },
  {
    name: 'create_discount', write: true,
    description: 'Create a discount code. For PERCENTAGE use a value of 1–100; for FIXED_AMOUNT the value is in store currency; FREE_SHIPPING ignores value.',
    schema: z.object({
      code: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
      type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
      value: z.number().min(0).max(100000).default(0),
      minOrderAmount: money.optional(), maxDiscount: money.optional(),
      usageLimit: z.number().int().min(1).optional(), perCustomerLimit: z.number().int().min(1).optional(),
      startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional()
    }),
    async handler(a, ctx) {
      if (a.type === 'PERCENTAGE' && (a.value <= 0 || a.value > 100)) fail('Percentage discounts need a value between 1 and 100')
      const code = a.code.toUpperCase()
      if (await db.discount.findUnique({ where: { code } })) fail(`Code ${code} already exists`)
      const d = await db.discount.create({
        data: {
          code, type: a.type, value: a.value, minOrderAmount: a.minOrderAmount ?? null, maxDiscount: a.maxDiscount ?? null,
          usageLimit: a.usageLimit ?? null, perCustomerLimit: a.perCustomerLimit ?? null,
          startDate: a.startsAt ? new Date(a.startsAt) : null, endDate: a.endsAt ? new Date(a.endsAt) : null, source: 'manual'
        }
      })
      await audit(ctx, 'discount.created', 'discount', d.id, { code })
      return { id: d.id, code: d.code, type: d.type, value: d.value }
    }
  },
  {
    name: 'set_discount_active', write: true,
    description: 'Enable or disable a discount code.',
    schema: z.object({ code: z.string(), active: z.boolean() }),
    async handler(a, ctx) {
      const d = await db.discount.findUnique({ where: { code: a.code.toUpperCase() } })
      if (!d) return fail(`Code ${a.code} not found`)
      await db.discount.update({ where: { id: d.id }, data: { isActive: a.active } })
      await audit(ctx, 'discount.updated', 'discount', d.id, { code: d.code, active: a.active })
      return { code: d.code, active: a.active }
    }
  },
  {
    name: 'create_page', write: true,
    description: 'Create a custom page (e.g. About, Shipping FAQ). Saved as DRAFT by default. Use add_section afterwards to design it with theme-editor blocks; once it has sections they replace the plain content.',
    schema: z.object({
      title: z.string().min(1).max(150), content: z.string().max(50000).default('').describe('HTML body'),
      excerpt: z.string().max(400).optional(), status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
      showInNav: z.boolean().default(false), seoTitle: z.string().max(120).optional(), seoDescription: z.string().max(320).optional()
    }),
    async handler(a, ctx) {
      const p = await db.customPage.create({
        data: { title: a.title, slug: await uniqueSlug('customPage', a.title), content: sanitizeHtml(a.content), excerpt: a.excerpt || null, status: a.status, showInNav: a.showInNav, navLabel: a.title, seoTitle: a.seoTitle || null, seoDescription: a.seoDescription || null }
      })
      await audit(ctx, 'page.created', 'page', p.id, { title: p.title })
      return { id: p.id, slug: p.slug, status: p.status, url: `/pages/${p.slug}` }
    }
  },
  {
    name: 'update_page', write: true,
    description: 'Update a custom page\'s title, content, status or SEO fields.',
    schema: z.object({
      page: z.string().describe('Page id or slug'), title: z.string().max(150).optional(), content: z.string().max(50000).optional(),
      excerpt: z.string().max(400).optional(), status: z.enum(['DRAFT', 'PUBLISHED']).optional(), showInNav: z.boolean().optional(),
      seoTitle: z.string().max(120).optional(), seoDescription: z.string().max(320).optional()
    }),
    async handler(a, ctx) {
      const row = await db.customPage.findFirst({ where: { OR: [{ id: a.page }, { slug: a.page }] } })
      if (!row) return fail(`Page "${a.page}" not found`)
      const data: any = {}
      for (const k of ['title', 'excerpt', 'status', 'showInNav', 'seoTitle', 'seoDescription'] as const) if (a[k] !== undefined) data[k] = a[k]
      if (a.content !== undefined) data.content = sanitizeHtml(a.content)
      const p = await db.customPage.update({ where: { id: row.id }, data })
      await audit(ctx, 'page.updated', 'page', p.id, { title: p.title, fields: Object.keys(data) })
      return { id: p.id, slug: p.slug, status: p.status }
    }
  },
  {
    name: 'create_campaign', write: true,
    description: 'Create a newsletter campaign as a DRAFT (it is never sent from here — a human reviews and sends it from Admin → Campaigns). Build it from blocks: heading {text,size,align}, text {html}, image {url,alt,link}, button {text,url,pill}, divider, spacer {height}.',
    schema: z.object({
      subject: z.string().min(1).max(200), preheader: z.string().max(200).optional(), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#1a1a1a'),
      blocks: z.array(z.object({ type: z.enum(['heading', 'text', 'image', 'button', 'divider', 'spacer']) }).passthrough()).min(1).max(40)
    }),
    async handler(a, ctx) {
      const blocks = a.blocks.map((b: any) => {
        const out = { ...b }
        if (out.html) out.html = sanitizeHtml(String(out.html))
        for (const k of ['url', 'link']) if (typeof out[k] === 'string' && !/^(https?:\/\/|\/|mailto:|tel:)/i.test(out[k])) out[k] = ''
        return out
      })
      const c = await db.newsletterCampaign.create({ data: { subject: a.subject, preheader: a.preheader || null, accentColor: a.accentColor, mode: 'blocks', blocks: JSON.stringify(blocks), status: 'draft' } })
      await audit(ctx, 'campaign.created', 'campaign', c.id, { subject: c.subject })
      return { id: c.id, status: 'draft', reviewAt: '/admin/newsletter', note: 'Draft created. Open it in the admin to preview, send a test and send.' }
    }
  },
  {
    name: 'update_order', write: true,
    description: 'Update an order\'s status, tracking info or internal note. Does not move money — use the admin for refunds.',
    schema: z.object({
      order: z.string().describe('Order id or number'),
      status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
      trackingNumber: z.string().max(100).optional(), trackingCarrier: z.string().max(60).optional(), internalNote: z.string().max(2000).optional()
    }),
    async handler(a, ctx) {
      const o = await db.order.findFirst({ where: { OR: [{ id: a.order }, { orderNumber: a.order }] } })
      if (!o) return fail(`Order "${a.order}" not found`)
      const data: any = {}
      if (a.status) data.status = a.status
      if (a.trackingNumber !== undefined) data.trackingNumber = a.trackingNumber
      if (a.trackingCarrier !== undefined) data.trackingCarrier = a.trackingCarrier
      if (a.internalNote) data.internalNotes = [o.internalNotes, `[MCP ${new Date().toISOString().slice(0, 10)}] ${a.internalNote}`].filter(Boolean).join('\n')
      await db.order.update({ where: { id: o.id }, data })
      await audit(ctx, 'order.status_changed', 'order', o.id, { orderNumber: o.orderNumber, ...data })
      return { number: o.orderNumber, updated: Object.keys(data) }
    }
  },

  // ===== Theme editor =====
  {
    name: 'add_section', write: true,
    description: 'Add a section to the home page or a custom page. The change is a DRAFT: it is visible to admins in the theme editor preview but not to shoppers until publish_page. `config` is merged over the type\'s defaults (see list_section_types). `position` is 0-based; omit to append.',
    schema: z.object({
      page: z.string().default('home'), type: z.string().describe('Section type, e.g. hero, product-grid, features'),
      config: z.record(z.string(), z.any()).default({}), position: z.number().int().min(0).optional()
    }),
    async handler(a, ctx) {
      if (!isSectionType(a.type)) fail(`Unknown section type "${a.type}". Call list_section_types.`)
      const p = await resolvePage(a.page)
      const config = JSON.stringify(sanitizeSectionConfig({ ...defaultConfig(a.type), ...a.config }))
      const created = await db.pageSection.create({ data: { pageType: p.pageType, pageId: p.pageId, sectionType: a.type, config, draftConfig: config, isDraft: true, sortOrder: 9999 } })
      const list = (await getEditorSections(p.pageType, p.pageId)).filter(s => s.id !== created.id)
      const at = Math.min(a.position ?? list.length, list.length)
      const ordered = [...list.slice(0, at), { id: created.id }, ...list.slice(at)]
      await db.$transaction(ordered.map((s, i) => db.pageSection.update({ where: { id: s.id }, data: { draftSortOrder: i } })))
      await audit(ctx, 'page.updated', 'section', created.id, { page: p.label, added: a.type })
      return { id: created.id, type: a.type, position: at, page: p.label, status: 'draft — call publish_page to make it live' }
    }
  },
  {
    name: 'update_section', write: true,
    description: 'Change a section\'s config (shallow-merged over the current draft; `design` is merged one level deeper) and/or show/hide it. Draft only until publish_page.',
    schema: z.object({ section: z.string().describe('Section id from get_page_layout'), config: z.record(z.string(), z.any()).optional(), visible: z.boolean().optional() }),
    async handler(a, ctx) {
      const row = await db.pageSection.findUnique({ where: { id: a.section } })
      if (!row || row.isDeleted) return fail(`Section "${a.section}" not found`)
      const current = withDraft(row).config
      const merged = { ...current, ...(a.config || {}) }
      if (a.config?.design) merged.design = { ...(current.design || {}), ...a.config.design }
      const data: any = {}
      if (a.config) data.draftConfig = JSON.stringify(sanitizeSectionConfig(merged))
      if (a.visible !== undefined) data.draftIsVisible = a.visible
      await db.pageSection.update({ where: { id: row.id }, data })
      await audit(ctx, 'page.updated', 'section', row.id, { type: row.sectionType })
      return { id: row.id, type: row.sectionType, status: 'draft — call publish_page to make it live' }
    }
  },
  {
    name: 'remove_section', write: true,
    description: 'Remove a section (draft change; it disappears from the storefront on publish_page).',
    schema: z.object({ section: z.string() }),
    async handler(a, ctx) {
      const row = await db.pageSection.findUnique({ where: { id: a.section } })
      if (!row) return fail(`Section "${a.section}" not found`)
      await db.pageSection.update({ where: { id: row.id }, data: { isDeleted: true } })
      await audit(ctx, 'page.updated', 'section', row.id, { removed: row.sectionType })
      return { removed: row.sectionType }
    }
  },
  {
    name: 'reorder_sections', write: true,
    description: 'Set the order of a page\'s sections. Pass every section id in the desired order (draft until publish_page).',
    schema: z.object({ page: z.string().default('home'), order: z.array(z.string()).min(1) }),
    async handler(a, ctx) {
      const p = await resolvePage(a.page)
      const current = await getEditorSections(p.pageType, p.pageId)
      const ids = new Set(current.map(s => s.id))
      if (a.order.some((id: string) => !ids.has(id))) fail('order contains ids that are not on this page — call get_page_layout')
      const rest = current.filter(s => !a.order.includes(s.id)).map(s => s.id)
      await db.$transaction([...a.order, ...rest].map((id: string, i: number) => db.pageSection.update({ where: { id }, data: { draftSortOrder: i } })))
      await audit(ctx, 'page.updated', 'page', p.pageId, { page: p.label, reordered: true })
      return { page: p.label, order: [...a.order, ...rest] }
    }
  },
  {
    name: 'publish_page', write: true,
    description: 'Publish all draft section changes on a page so shoppers see them. Review with get_page_layout first.',
    schema: z.object({ page: z.string().default('home') }),
    async handler(a, ctx) {
      const p = await resolvePage(a.page)
      const n = await applySectionAction(p.pageType, p.pageId, 'publish')
      await audit(ctx, 'page.updated', 'page', p.pageId, { page: p.label, published: true })
      return { page: p.label, published: true, sections: n }
    }
  },
  {
    name: 'discard_page_changes', write: true,
    description: 'Throw away all unpublished section changes on a page and go back to the live version.',
    schema: z.object({ page: z.string().default('home') }),
    async handler(a, ctx) {
      const p = await resolvePage(a.page)
      await applySectionAction(p.pageType, p.pageId, 'discard')
      await audit(ctx, 'page.updated', 'page', p.pageId, { page: p.label, discarded: true })
      return { page: p.label, discarded: true }
    }
  }
]

export { ToolError }
export const TOOL_BY_NAME = Object.fromEntries(TOOLS.map(t => [t.name, t]))

export function toolDescriptors(scope: 'read' | 'write') {
  return TOOLS.filter(t => scope === 'write' || !t.write).map(t => {
    const { $schema, ...inputSchema } = z.toJSONSchema(t.schema) as any
    return { name: t.name, description: t.description + (t.write ? '' : ''), inputSchema }
  })
}
