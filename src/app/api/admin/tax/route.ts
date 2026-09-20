import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const r = await db.taxRate.create({
      data: {
        country: body.country,
        region: body.region || null,
        rate: Number(body.rate) || 0,
        name: body.name || null,
        isActive: body.isActive ?? true
      }
    })
    return NextResponse.json({ rate: r })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
