import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req) {
  try {
    const { code, subtotal } = await req.json()
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Code required' }, { status: 400 })
    }
    const d = await db.discount.findUnique({ where: { code: code.toUpperCase().trim() } })
    if (!d || !d.isActive) {
      return NextResponse.json({ valid: false, error: 'Invalid code' })
    }
    const now = new Date()
    if (d.startDate && d.startDate > now) {
      return NextResponse.json({ valid: false, error: 'Not yet active' })
    }
    if (d.endDate && d.endDate < now) {
      return NextResponse.json({ valid: false, error: 'Expired' })
    }
    if (d.usageLimit != null && d.usedCount >= d.usageLimit) {
      return NextResponse.json({ valid: false, error: 'Usage limit reached' })
    }
    if (d.minOrderAmount && subtotal < d.minOrderAmount) {
      return NextResponse.json({ valid: false, error: `Min order of $${d.minOrderAmount} required` })
    }
    return NextResponse.json({
      valid: true,
      discount: {
        id: d.id,
        code: d.code,
        type: d.type,
        value: d.value,
        maxDiscount: d.maxDiscount
      }
    })
  } catch (e) {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
