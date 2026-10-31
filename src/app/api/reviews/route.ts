import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logEvent } from '@/lib/logs'
import { z } from 'zod'

const reviewSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  authorName: z.string().min(1).max(100),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  email: z.string().email().optional().or(z.literal('')),
  consent: z.boolean()
})

export async function POST(req) {
  try {
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    if (!parsed.data.consent) {
      return NextResponse.json({ error: 'Consent required' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id: parsed.data.productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const review = await db.productReview.create({
      data: {
        productId: parsed.data.productId,
        rating: parsed.data.rating,
        authorName: parsed.data.authorName,
        title: parsed.data.title || null,
        body: parsed.data.body,
        isApproved: false // requires admin approval
      }
    })

    await logEvent('review.created', {
      entity: 'review', entityId: review.id,
      metadata: {
        product: product.name,
        rating: parsed.data.rating,
        author: parsed.data.authorName,
        title: parsed.data.title || null
      }
    })

    return NextResponse.json({ ok: true, id: review.id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const approved = searchParams.get('approved') !== 'false'

  const reviews = await db.productReview.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(approved ? { isApproved: true } : {})
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ reviews })
}
