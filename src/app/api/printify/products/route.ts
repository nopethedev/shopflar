import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listPrintifyProducts, importPrintifyProduct } from '@/lib/printify/sync'

export async function GET(req) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get('shopId')
    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 })
    const products = await listPrintifyProducts(shopId)
    return NextResponse.json({ products })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function POST(req) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const shopId = searchParams.get('shopId')
    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 })

    // List all and import each
    const list = await listPrintifyProducts(shopId)
    let imported = 0
    for (const p of list.data || []) {
      try {
        await importPrintifyProduct(shopId, p.id)
        imported++
      } catch (e) {
        console.error(`Failed to import ${p.id}:`, e.message)
      }
    }
    return NextResponse.json({ imported, total: list.data?.length || 0 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
