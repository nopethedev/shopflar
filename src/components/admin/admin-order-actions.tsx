'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { CheckCircle2 } from 'lucide-react'

const STATUSES = ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED']

export function AdminOrderActions({ order }) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '')
  const [internalNotes, setInternalNotes] = useState(order.internalNotes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber, internalNotes })
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

  return (
    <div className="rounded-xl border border-border bg-background p-5 space-y-3">
      <h2 className="font-semibold">Order Actions</h2>

      <div>
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Tracking Number</Label>
        <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g., 1Z999AA..." />
      </div>

      <div>
        <Label className="text-xs">Internal Notes</Label>
        <Textarea rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Notes visible only to admins" />
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>

      {order.paymentStatus === 'PAID' && (
        <Button onClick={refund} variant="outline" className="w-full text-destructive hover:text-destructive">
          Process Refund
        </Button>
      )}
    </div>
  )
}
