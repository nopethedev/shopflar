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
import { UserPlus, Trash2, Shield, MailCheck, MailX, Send } from 'lucide-react'

export function AdminUsersManager({ users, currentUser }) {
  const router = useRouter()
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('ADMIN')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [showCustomers, setShowCustomers] = useState(false)

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

  const patchUser = async (id, body, successMsg) => {
    setUpdating(id)
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (r.ok) {
        toast.success(successMsg)
        router.refresh()
      } else {
        const d = await r.json()
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setUpdating(null)
    }
  }

  const updateRole = (id, role) => patchUser(id, { role }, 'Role updated')

  const setVerified = (u, verified) =>
    patchUser(
      u.id,
      { verified },
      verified
        ? `${u.email} marked as verified`
        : `${u.email} marked as unverified — they'll need to verify by email again`
    )

  const resendVerification = async (u) => {
    setUpdating(u.id)
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (r.ok) toast.success('Verification email sent', u.email)
      else throw new Error(d.error || 'Failed')
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setUpdating(null)
    }
  }

  const del = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Deleted'); router.refresh() }
    else toast.error('Failed')
  }

  const admins = users.filter(u => u.role !== 'CUSTOMER')
  const customers = users.filter(u => u.role === 'CUSTOMER')

  const renderRow = (u) => {
    const verified = !!u.emailVerified
    return (
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
        <td className="p-2">
          {verified ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1" variant="outline">
              <MailCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1" variant="outline">
              <MailX className="h-3 w-3" /> Unverified
            </Badge>
          )}
        </td>
        <td className="p-2 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
        <td className="p-2">
          <div className="flex items-center gap-1.5 justify-end">
            {!verified && u.id !== currentUser.id && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updating === u.id}
                  onClick={() => resendVerification(u)}
                  title="Resend verification email"
                >
                  <Send className="h-3 w-3 mr-1" /> Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={updating === u.id}
                  onClick={() => setVerified(u, true)}
                  title="Mark as verified manually (skips the email)"
                >
                  Verify
                </Button>
              </>
            )}
            {verified && u.id !== currentUser.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                disabled={updating === u.id}
                onClick={() => setVerified(u, false)}
                title="Mark as unverified — blocks sign-in until they verify again"
              >
                Unverify
              </Button>
            )}
            {u.id !== currentUser.id && (
              <button onClick={() => del(u.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const headCell = (label, right) => (
    <th className={`p-2 font-medium ${right ? 'text-right' : 'text-left'}`}>{label}</th>
  )

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
        <p className="text-xs text-muted-foreground mt-2">
          Admins created here are trusted and pre-verified — no email confirmation needed.
        </p>
        <Button className="mt-3" onClick={createUser} disabled={creating}>
          {creating ? 'Creating...' : 'Create Admin'}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4" /> Admin Users</h3>
        <p className="text-xs text-muted-foreground mb-4">{admins.length} admins & super admins</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {headCell('User')}{headCell('Role')}{headCell('Email')}{headCell('Created')}{headCell('', true)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.map(renderRow)}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold flex items-center gap-2"><MailCheck className="h-4 w-4" /> Customers</h3>
          <Button variant="outline" size="sm" onClick={() => setShowCustomers(s => !s)}>
            {showCustomers ? 'Hide' : `Show all (${customers.length})`}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Unverified customers can&apos;t sign in until they click the link in their verification email
          (when &ldquo;Require email verification&rdquo; is enabled in Store Settings).
        </p>
        {(showCustomers ? customers : customers.slice(0, 5)).length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {headCell('User')}{headCell('Role')}{headCell('Email')}{headCell('Created')}{headCell('', true)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(showCustomers ? customers : customers.slice(0, 5)).map(renderRow)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
