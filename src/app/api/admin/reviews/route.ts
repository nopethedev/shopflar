import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
    const reviews = await db.productReview.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, slug: true, id: true } } }
    })
    return NextResponse.json({ reviews })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const review = await db.productReview.create({
      data: {
        productId: body.productId,
        rating: parseInt(body.rating) || 5,
        authorName: body.authorName,
        title: body.title || null,
        body: body.body,
        isApproved: body.isApproved !== false
      }
    })
    return NextResponse.json({ review })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
