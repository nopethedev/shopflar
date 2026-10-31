import { NextResponse } from 'next/server'
import { rollDiceForOrder, getDiceConfig } from '@/lib/dice'
import { z } from 'zod'

const schema = z.object({ orderId: z.string().min(1) })

// POST /api/orders/dice — roll the Free Order Dice for a paid order.
// Server-authoritative and idempotent: the roll happens exactly once per
// order and is persisted; repeat calls return the stored result.
export async function POST(req) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const config = await getDiceConfig()
    if (!config.enabled) {
      return NextResponse.json({ enabled: false })
    }
    const result = await rollDiceForOrder(parsed.data.orderId)
    if (!result) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json({ enabled: true, ...result })
  } catch (e) {
    console.error('Dice roll error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
