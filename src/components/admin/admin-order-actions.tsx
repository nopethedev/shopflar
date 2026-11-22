'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { carrierNames, resolveCarrierUrl } from '@/lib/tracking'

const STATUSES = ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED']

export function AdminOrderActions({ order }) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '')
  const [trackingCarrier, setTrackingCarrier] = useState(order.trackingCarrier || '')
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber, trackingCarrier, internalNotes })
      })
      if (!r.ok) throw new Error('Failed to update')
      toast.success('Order updated')
      router.refresh()
    } catch (e) {
      toast.error('Update failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  const syncPrintify = async () => {
    setSyncing(true)
    try {
      const r = await fetch(`/api/admin/orders/${order.id}/sync-tracking`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Sync failed')
      if (d.trackingNumber) {
        setTrackingNumber(d.trackingNumber)
        if (d.trackingCarrier) setTrackingCarrier(d.trackingCarrier)
        toast.success('Tracking synced from Printify', `${d.trackingCarrier || 'Carrier'} · ${d.trackingNumber}`)
      } else {
        toast.info('No tracking yet', `Printify status: ${d.printifyStatus || 'unknown'} — try again once it ships.`)
      }
      router.refresh()
    } catch (e) {
      toast.error('Sync failed', e.message)
    } finally {
      setSyncing(false)
    }
  }

  const markPaid = async () => {
    if (!confirm('Confirm that you received this payment? This marks the order paid and sends the customer their confirmation.')) return
    try {
      const r = await fetch(`/api/admin/orders/${order.id}/mark-paid`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.success('Order marked as paid')
      router.refresh()
    } catch (e) {
      toast.error('Could not mark as paid', e.message)
    }
  }

  const refund = async () => {
    if (!confirm('Refund this order? This action cannot be undone.')) return
    if (!order.paymentProvider || order.paymentProvider === 'cod') {
      toast.info('Refund', 'No payment to refund for COD orders. Mark as REFUNDED instead.')
      setStatus('REFUNDED')
      return save()
    }
    const r = await fetch(`/api/admin/orders/${order.id}/refund`, { method: 'POST' })
    if (r.ok) {
      toast.success('Refund processed')
      router.refresh()
    } else {
      const d = await r.json()
      toast.error('Refund failed', d.error)
    }
  }

  const previewUrl = trackingNumber ? resolveCarrierUrl(trackingCarrier, trackingNumber) : null

  return (
    <div className="sf-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e3e3e3]">
        <h2 className="sf-section-title">Update order</h2>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-[#616161] mb-1">Order status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-[12px]">{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#616161] mb-1">Tracking number</label>
          <div className="flex gap-1.5">
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="1Z999AA..."
              className="sf-input"
            />
            {order.printifyOrderId && (
              <button
                type="button"
                onClick={syncPrintify}
                disabled={syncing}
                className="sf-btn sf-btn-secondary shrink-0 px-2.5"
                title="Pull tracking from Printify"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#616161] mb-1">Carrier</label>
          <Select value={trackingCarrier || 'none'} onValueChange={v => setTrackingCarrier(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[12px]">Auto-detect from number</SelectItem>
              {carrierNames().map(c => (
                <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#005bd3] hover:underline mt-1">
              <ExternalLink className="h-3 w-3" /> Preview tracking link
            </a>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#616161] mb-1">Internal notes</label>
          <textarea
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Visible only to staff"
            className="sf-input h-auto py-2 resize-y"
          />
        </div>

        <button onClick={save} disabled={saving} className="sf-btn sf-btn-primary w-full disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        {order.paymentStatus === 'UNPAID' && !['CANCELLED', 'REFUNDED', 'FAILED'].includes(order.status) && (
          <button onClick={markPaid} className="sf-btn sf-btn-secondary w-full">
            Mark as paid
          </button>
        )}

        {order.paymentStatus === 'PAID' && (
          <button onClick={refund} className="sf-btn sf-btn-secondary w-full text-rose-600 border-rose-200 hover:bg-rose-50">
            Refund order
          </button>
        )}
      </div>
    </div>
  )
}
