import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'

export async function GET(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { name: 'asc' } },
        categories: true,
        tags: true,
        printifyLink: true,
        reviews: true
      }
    })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()

    const existing = await db.product.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let slug = existing.slug
    if (body.slug && body.slug !== existing.slug) {
      slug = slugify(body.slug)
      const dup = await db.product.findUnique({ where: { slug } })
      if (dup && dup.id !== params.id) {
        slug = `${slug}-${Date.now().toString(36).slice(-5)}`
      }
    }

    // Determine if we need to set publishedAt
    const wasDraft = existing.status === 'DRAFT'
    const nowPublished = body.status === 'PUBLISHED' && wasDraft

    // Update base product
    const updated = await db.product.update({
      where: { id: params.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(slug !== existing.slug ? { slug } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.shortDescription !== undefined ? { shortDescription: body.shortDescription || null } : {}),
        ...(body.price != null ? { price: Number(body.price) } : {}),
        ...(body.compareAtPrice !== undefined ? { compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null } : {}),
        ...(body.costPrice !== undefined ? { costPrice: body.costPrice ? Number(body.costPrice) : null } : {}),
        ...(body.sku !== undefined ? { sku: body.sku || null } : {}),
        ...(body.barcode !== undefined ? { barcode: body.barcode || null } : {}),
        ...(body.inventoryQty != null ? { inventoryQty: parseInt(body.inventoryQty) || 0, isOutOfStock: (parseInt(body.inventoryQty) || 0) <= 0 } : {}),
        ...(body.lowStockThreshold != null ? { lowStockThreshold: parseInt(body.lowStockThreshold) || 5 } : {}),
        ...(body.status != null ? { status: body.status, publishedAt: nowPublished ? new Date() : existing.publishedAt } : {}),
        ...(body.featured != null ? { featured: !!body.featured } : {}),
        ...(body.weight !== undefined ? { weight: body.weight ? Number(body.weight) : null } : {}),
        ...(body.length !== undefined ? { length: body.length ? Number(body.length) : null } : {}),
        ...(body.width !== undefined ? { width: body.width ? Number(body.width) : null } : {}),
        ...(body.height !== undefined ? { height: body.height ? Number(body.height) : null } : {}),
        ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle || null } : {}),
        ...(body.seoDescription !== undefined ? { seoDescription: body.seoDescription || null } : {}),
        ...(body.productType != null ? { productType: body.productType } : {}),
        ...(body.downloadUrl !== undefined ? { downloadUrl: body.downloadUrl || null } : {}),
        ...(body.downloadLimit != null ? { downloadLimit: parseInt(body.downloadLimit) || 0 } : {}),
        ...(body.codePool !== undefined ? { codePool: body.codePool } : {}),
        // EU compliance fields
        ...(body.fibreComposition !== undefined ? { fibreComposition: body.fibreComposition || null } : {}),
        ...(body.countryOfOrigin !== undefined ? { countryOfOrigin: body.countryOfOrigin || null } : {}),
        ...(body.manufacturerName !== undefined ? { manufacturerName: body.manufacturerName || null } : {}),
        ...(body.manufacturerAddress !== undefined ? { manufacturerAddress: body.manufacturerAddress || null } : {}),
        ...(body.safetyWarnings !== undefined ? { safetyWarnings: body.safetyWarnings || null } : {}),
        ...(body.careInstructions !== undefined ? { careInstructions: body.careInstructions || null } : {}),
        ...(body.warrantyInfo !== undefined ? { warrantyInfo: body.warrantyInfo || null } : {})
      }
    })

    // Replace categories
    if (body.categoryIds) {
      await db.productCategory.deleteMany({ where: { productId: params.id } })
      if (body.categoryIds.length > 0) {
        await db.productCategory.createMany({
          data: body.categoryIds.map(cid => ({ productId: params.id, categoryId: cid }))
        })
      }
    }

    // Replace tags
    if (body.tags) {
      await db.productTag.deleteMany({ where: { productId: params.id } })
      if (body.tags.length > 0) {
        await db.productTag.createMany({
          data: body.tags.map(t => ({ productId: params.id, tag: t }))
        })
      }
    }

    // Replace images (only if provided)
    if (body.images) {
      await db.productImage.deleteMany({ where: { productId: params.id } })
      if (body.images.length > 0) {
        await db.productImage.createMany({
          data: body.images.map((img, i) => ({ productId: params.id, url: img.url, altText: img.altText || null, sortOrder: i }))
        })
      }
    }

    // Replace variants (only if provided)
    if (body.variants) {
      const existingVariants = await db.productVariant.findMany({ where: { productId: params.id } })
      const newIds = body.variants.filter(v => v.id).map(v => v.id)
      // Delete removed variants
      for (const v of existingVariants) {
        if (!newIds.includes(v.id)) {
          await db.productVariant.delete({ where: { id: v.id } }).catch(() => {})
        }
      }
      // Update or create
      for (const v of body.variants) {
        if (v.id && !String(v.id).startsWith('new_')) {
          await db.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              options: typeof v.options === 'string' ? v.options : JSON.stringify(v.options),
              sku: v.sku || null,
              price: v.price ? Number(v.price) : null,
              inventoryQty: parseInt(v.inventoryQty) || 0
            }
          })
        } else {
          await db.productVariant.create({
            data: {
              productId: params.id,
              name: v.name,
              options: typeof v.options === 'string' ? v.options : JSON.stringify(v.options),
              sku: v.sku || null,
              price: v.price ? Number(v.price) : null,
              inventoryQty: parseInt(v.inventoryQty) || 0
            }
          })
        }
      }
    }

    return NextResponse.json({ product: updated })
  } catch (e) {
    console.error('Update product error:', e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    await db.product.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
