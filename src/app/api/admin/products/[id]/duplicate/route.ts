import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'

export async function POST(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const original = await db.product.findUnique({
      where: { id: params.id },
      include: { images: true, variants: true, categories: true, tags: true }
    })
    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const slug = `${slugify(original.name)}-${Date.now().toString(36).slice(-5)}`
    const copy = await db.product.create({
      data: {
        name: `${original.name} (Copy)`,
        slug,
        description: original.description,
        shortDescription: original.shortDescription,
        price: original.price,
        compareAtPrice: original.compareAtPrice,
        costPrice: original.costPrice,
        sku: original.sku ? `${original.sku}-COPY` : null,
        barcode: original.barcode,
        inventoryQty: original.inventoryQty,
        lowStockThreshold: original.lowStockThreshold,
        status: 'DRAFT',
        featured: false,
        weight: original.weight,
        length: original.length,
        width: original.width,
        height: original.height,
        seoTitle: original.seoTitle,
        seoDescription: original.seoDescription,
        images: { create: original.images.map(i => ({ url: i.url, altText: i.altText, sortOrder: i.sortOrder })) },
        variants: { create: original.variants.map(v => ({ name: v.name, options: v.options, sku: v.sku, price: v.price, inventoryQty: v.inventoryQty, weight: v.weight, barcode: v.barcode })) },
        categories: { create: original.categories.map(c => ({ categoryId: c.categoryId })) },
        tags: { create: original.tags.map(t => ({ tag: t.tag })) }
      }
    })
    return NextResponse.json({ product: copy })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
