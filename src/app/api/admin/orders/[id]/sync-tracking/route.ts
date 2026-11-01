import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { syncPrintifyTracking } from '@/lib/printify/sync'
import { logEvent } from '@/lib/logs'

// POST /api/admin/orders/[id]/sync-tracking — pull latest fulfillment status
// and tracking number(s) from Printify into this order.
export async function POST(req, { params }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    const result = await syncPrintifyTracking(id)

    await logEvent('order.status_changed', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'order', entityId: id,
      metadata: {
        source: 'printify_sync',
        printifyStatus: result.printifyStatus,
        trackingNumber: result.order.trackingNumber || null,
        trackingCarrier: result.order.trackingCarrier || null,
        shipments: result.shipments.length
      },
      notify: false
    })

    return NextResponse.json({
      ok: true,
      trackingNumber: result.order.trackingNumber,
      trackingCarrier: result.order.trackingCarrier,
      trackingUrl: result.order.trackingUrl,
      status: result.order.status,
      fulfillmentStatus: result.order.fulfillmentStatus,
      printifyStatus: result.printifyStatus,
      shipments: result.shipments
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
