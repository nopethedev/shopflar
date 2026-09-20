import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '8')

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const products = await db.product.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { sku: { contains: q } },
        { tags: { some: { tag: { contains: q } } } }
      ]
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: { take: 1 }
    },
    take: limit
  })

  return NextResponse.json({
    results: products.map(p => ({
      ...p,
      image: p.images?.[0]?.url || null
    }))
  })
}
