import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    if (!body.productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 })

    const crate = await db.mysteryCrate.create({
      data: {
        productId: body.productId,
        guaranteedItems: body.guaranteedItems || '[]',
        poolItems: body.poolItems || '[]',
        poolSize: parseInt(body.poolSize) || 1
      }
    })
    return NextResponse.json({ crate })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const crates = await db.mysteryCrate.findMany({
      include: { product: { select: { name: true, slug: true, id: true, price: true } } }
    })
    return NextResponse.json({ crates })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
