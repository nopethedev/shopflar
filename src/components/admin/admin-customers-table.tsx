'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'

export function AdminCustomersTable({ customers, total, page, limit, search: initialSearch }) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); router.push(`/admin/customers?search=${encodeURIComponent(search)}`) }} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name..." className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead>Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No customers found.</TableCell>
              </TableRow>
            ) : customers.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">
                    {u.profile?.firstName || u.name || u.email.split('@')[0]}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.orders[0] ? new Date(u.orders[0].createdAt).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-sm font-medium">${(u.orders.reduce((s, o) => s + o.total, 0)).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => router.push(`/admin/customers?page=${page - 1}${search ? `&search=${search}` : ''}`)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / limit)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => router.push(`/admin/customers?page=${page + 1}${search ? `&search=${search}` : ''}`)}>Next</Button>
        </div>
      )}
    </div>
  )
}
