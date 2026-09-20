import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const m = await db.shippingMethod.create({
      data: {
        name: body.name,
        description: body.description || null,
        price: Number(body.price) || 0,
        freeShippingThreshold: body.freeShippingThreshold ? Number(body.freeShippingThreshold) : null,
        countries: body.countries || 'ALL',
        estimatedDays: body.estimatedDays || null,
        isActive: !!body.isActive,
        sortOrder: parseInt(body.sortOrder) || 0
      }
    })
    return NextResponse.json({ method: m })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
