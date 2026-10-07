import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const ids = searchParams.get('ids')
  const minPrice = parseFloat(searchParams.get('minPrice') || '0')
  const maxPrice = parseFloat(searchParams.get('maxPrice') || '9999')
  const categories = searchParams.get('categories')
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')
  const featured = searchParams.get('featured') === 'true'
  const sale = searchParams.get('sale') === 'true'
  const isNew = searchParams.get('new') === 'true'
  const inStock = searchParams.get('inStock') === 'true'

  const where = {
    status: 'PUBLISHED',
    ...(ids ? { id: { in: ids.split(',') } } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
        { shortDescription: { contains: search } },
        { tags: { some: { tag: { contains: search } } } }
      ]
    } : {}),
    price: { gte: minPrice, lte: maxPrice },
    ...(featured ? { featured: true } : {}),
    ...(sale ? { compareAtPrice: { gt: 0 } } : {}),
    ...(inStock ? { isOutOfStock: false } : {}),
    ...(categories ? { categories: { some: { categoryId: { in: categories.split(',') } } } } : {})
  }

  let orderBy = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { price: 'asc' }
  else if (sort === 'price_desc') orderBy = { price: 'desc' }
  else if (sort === 'name') orderBy = { name: 'asc' }
  else if (sort === 'featured') orderBy = { featured: 'desc' }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 2 },
        categories: { include: { category: true } },
        variants: true,
        mysteryCrate: true
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    db.product.count({ where })
  ])

  return NextResponse.json({ products, total, page, limit, totalPages: Math.ceil(total / limit) })
}
