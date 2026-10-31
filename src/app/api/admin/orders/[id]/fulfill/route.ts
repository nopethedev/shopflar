import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { manuallyFulfillOrder } from '@/lib/fulfillment'

// POST /api/admin/orders/[id]/fulfill — manually send an order to a fulfillment provider
export async function POST(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const { id } = await params
    const { provider } = await req.json()

    if (!provider) {
      return NextResponse.json({ error: 'Provider name required (e.g., "printful", "cj", "printify")' }, { status: 400 })
    }

    const result = await manuallyFulfillOrder(id, provider)
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
