import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'
import { logEvent } from '@/lib/logs'

export async function GET() {
  await requireAdmin()
  const products = await db.product.findMany({
    include: { images: { take: 1 }, categories: { include: { category: true } }, variants: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  })
  return NextResponse.json({ products })
}

export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()

    let slug = body.slug ? slugify(body.slug) : slugify(body.name)
    // Ensure slug is unique
    const existing = await db.product.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-5)}`
    }

    const product = await db.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        price: Number(body.price) || 0,
        compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        sku: body.sku || null,
        barcode: body.barcode || null,
        inventoryQty: parseInt(body.inventoryQty) || 0,
        lowStockThreshold: parseInt(body.lowStockThreshold) || 5,
        status: body.status || 'DRAFT',
        featured: !!body.featured,
        isOutOfStock: (parseInt(body.inventoryQty) || 0) <= 0,
        weight: body.weight ? Number(body.weight) : null,
        length: body.length ? Number(body.length) : null,
        width: body.width ? Number(body.width) : null,
        height: body.height ? Number(body.height) : null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
        productType: body.productType || 'physical',
        downloadUrl: body.downloadUrl || null,
        downloadLimit: parseInt(body.downloadLimit) || 0,
        codePool: body.codePool || null,
        // EU compliance fields
        fibreComposition: body.fibreComposition || null,
        countryOfOrigin: body.countryOfOrigin || null,
        manufacturerName: body.manufacturerName || null,
        manufacturerAddress: body.manufacturerAddress || null,
        safetyWarnings: body.safetyWarnings || null,
        careInstructions: body.careInstructions || null,
        warrantyInfo: body.warrantyInfo || null,
        categories: body.categoryIds?.length ? { create: body.categoryIds.map((cid) => ({ categoryId: cid })) } : undefined,
        images: body.images?.length ? { create: body.images.map((img, i) => ({ url: img.url, altText: img.altText, sortOrder: i })) } : undefined,
        variants: body.variants?.length ? { create: body.variants.map(v => ({ name: v.name, options: v.options, sku: v.sku, price: v.price ? Number(v.price) : null, inventoryQty: parseInt(v.inventoryQty) || 0 })) } : undefined,
        tags: body.tags?.length ? { create: body.tags.map((t) => ({ tag: t })) } : undefined
      }
    })

    await logEvent('product.created', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'product', entityId: product.id,
      metadata: { name: product.name, price: `$${product.price.toFixed(2)}`, status: product.status },
      notify: false
    })

    return NextResponse.json({ product })
  } catch (e) {
    console.error('Create product error:', e)
    return NextResponse.json({ error: e.message || 'Failed to create product' }, { status: 400 })
  }
}
