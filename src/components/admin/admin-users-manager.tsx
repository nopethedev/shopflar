'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { UserPlus, Trash2, Shield } from 'lucide-react'

export function AdminUsersManager({ users, currentUser }) {
  const router = useRouter()
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('ADMIN')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(null)

  const createUser = async () => {
    if (!newEmail || !newPassword) { toast.error('Email and password required'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, role: newRole })
      })
      if (r.ok) {
        toast.success('User created')
        setNewEmail(''); setNewPassword(''); setNewName('')
        router.refresh()
      } else {
        const d = await r.json()
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setCreating(false)
    }
  }

  const updateRole = async (id, role) => {
    setUpdating(id)
    const r = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    if (r.ok) {
      toast.success('Role updated')
      router.refresh()
    } else {
      toast.error('Failed')
    }
    setUpdating(null)
  }

  const del = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Deleted'); router.refresh() }
    else toast.error('Failed')
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4" /> Create New Admin</h3>
        <div className="grid sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Optional" /></div>
          <div><Label className="text-xs">Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
          <div><Label className="text-xs">Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars" /></div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-3" onClick={createUser} disabled={creating}>
          {creating ? 'Creating...' : 'Create Admin'}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield className="h-4 w-4" /> All Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">User</th>
                <th className="text-left p-2 font-medium">Role</th>
                <th className="text-left p-2 font-medium">Created</th>
                <th className="w-10 p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-2">
                    <p className="font-medium">{u.name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="p-2">
                    {u.id === currentUser.id ? (
                      <Badge>{u.role.replace('_', ' ')} (you)</Badge>
                    ) : (
                      <Select
                        defaultValue={u.role}
                        onValueChange={(v) => updateRole(u.id, v)}
                        disabled={updating === u.id}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CUSTOMER">Customer</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-2">
                    {u.id !== currentUser.id && (
                      <button onClick={() => del(u.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
