import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { syncPrintifyShops } from '@/lib/printify/sync'

export async function POST() {
  try {
    await requireAdmin()
    const shops = await syncPrintifyShops()
    return NextResponse.json({ shops, imported: shops.length })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
