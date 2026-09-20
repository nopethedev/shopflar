'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'

export function AdminDiscountsTable({ discounts }) {
  const router = useRouter()
  const [toggling, setToggling] = useState(null)

  const toggle = async (id, current) => {
    setToggling(id)
    const r = await fetch(`/api/admin/discounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current })
    })
    if (r.ok) {
      toast.success('Updated')
      router.refresh()
    } else {
      toast.error('Failed')
    }
    setToggling(null)
  }

  const del = async (id) => {
    if (!confirm('Delete this discount?')) return
    const r = await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Deleted')
      router.refresh()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No discounts yet.</TableCell>
            </TableRow>
          ) : discounts.map(d => (
            <TableRow key={d.id}>
              <TableCell><code className="font-mono text-sm font-semibold bg-muted px-2 py-0.5 rounded">{d.code}</code></TableCell>
              <TableCell><Badge variant="outline">{d.type.replace('_', ' ')}</Badge></TableCell>
              <TableCell className="text-sm">
                {d.type === 'PERCENTAGE' ? `${d.value}%` : d.type === 'FIXED_AMOUNT' ? `$${d.value}` : 'Free shipping'}
              </TableCell>
              <TableCell className="text-sm">
                {d._count?.usage || 0}{d.usageLimit ? ` / ${d.usageLimit}` : ''}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {d.startDate ? new Date(d.startDate).toLocaleDateString() : '—'}
                {' → '}
                {d.endDate ? new Date(d.endDate).toLocaleDateString() : '∞'}
              </TableCell>
              <TableCell>
                <Switch
                  checked={d.isActive}
                  disabled={toggling === d.id}
                  onCheckedChange={() => toggle(d.id, d.isActive)}
                />
              </TableCell>
              <TableCell>
                <button onClick={() => del(d.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
