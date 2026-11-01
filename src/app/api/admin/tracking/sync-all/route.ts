import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { syncAllPrintifyTracking } from '@/lib/printify/sync'

// POST /api/admin/tracking/sync-all — refresh tracking from Printify for
// every order that was pushed to Printify and isn't in a final state yet.
export async function POST() {
  try {
    await requireAdmin()
    const results = await syncAllPrintifyTracking()
    const ok = results.filter(r => r.ok)
    const failed = results.filter(r => !r.ok)
    return NextResponse.json({
      ok: true,
      total: results.length,
      synced: ok.length,
      withTracking: ok.filter(r => r.trackingNumber).length,
      failed: failed.length,
      errors: failed.map(f => ({ orderId: f.orderId, error: f.error }))
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
