import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logEvent } from '@/lib/logs'

export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()
    const existing = await db.discount.findUnique({ where: { code: body.code.toUpperCase() } })
    if (existing) return NextResponse.json({ error: 'Code already exists' }, { status: 400 })

    const d = await db.discount.create({
      data: {
        code: body.code.toUpperCase(),
        type: body.type,
        value: Number(body.value) || 0,
        minOrderAmount: body.minOrderAmount ? Number(body.minOrderAmount) : null,
        maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        usageLimit: body.usageLimit ? parseInt(body.usageLimit) : null,
        perCustomerLimit: body.perCustomerLimit ? parseInt(body.perCustomerLimit) : null,
        isActive: !!body.isActive
      }
    })
    await logEvent('discount.created', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'discount', entityId: d.id,
      metadata: { code: d.code, type: d.type, value: d.value },
      notify: false
    })
    return NextResponse.json({ discount: d })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET() {
  await requireAdmin()
  const discounts = await db.discount.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { usage: true } } } })
  return NextResponse.json({ discounts })
}
