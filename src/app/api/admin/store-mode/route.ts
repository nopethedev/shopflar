import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const ALLOWED_KEYS = new Set([
  'maintenance_enabled', 'maintenance_title', 'maintenance_message', 'maintenance_image',
  'prelaunch_enabled', 'prelaunch_title', 'prelaunch_subtitle', 'prelaunch_image', 'prelaunch_launch_date',
  'sale_limit_enabled', 'sale_limit_amount', 'sale_limit_warning'
])

export async function PATCH(req) {
  try {
    await requireAdmin()
    const body = await req.json()

    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(key)) {
        await db.storeSetting.upsert({
          where: { key },
          update: { value: String(value || '') },
          create: { key, value: String(value || '') }
        })
      }
    }

    // If sale limit is enabled and exceeded, mark all products out of stock
    if (body.sale_limit_enabled === 'true' || body.sale_limit_amount) {
      await checkAndApplySaleLimit()
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// Check sale limit and mark products out of stock if exceeded
async function checkAndApplySaleLimit() {
  const { getSaleLimitStatus } = await import('@/lib/settings')
  const status = await getSaleLimitStatus()

  if (!status.enabled) return

  if (status.exceeded || status.warning) {
    // Mark all published products as out of stock
    await db.product.updateMany({
      where: { status: 'PUBLISHED', isOutOfStock: false },
      data: { isOutOfStock: true }
    })
  } else {
    // If we're no longer at the limit, un-mark products (restore based on actual inventory)
    const products = await db.product.findMany({
      where: { status: 'PUBLISHED', isOutOfStock: true, trackInventory: true }
    })
    for (const p of products) {
      if (p.inventoryQty > 0) {
        await db.product.update({ where: { id: p.id }, data: { isOutOfStock: false } })
      }
    }
  }
}
