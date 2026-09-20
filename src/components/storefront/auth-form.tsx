'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/lib/toast'
import { useCart } from '@/lib/cart-store'

export function AuthForm({ mode, nextUrl }) {
  const router = useRouter()
  const initGuestId = useCart(s => s.initGuestId)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const isLogin = mode === 'login'

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup'
      const body = isLogin
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, name: form.name }
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Authentication failed')
      toast.success(isLogin ? 'Welcome back!' : 'Account created!', d.user?.email)
      initGuestId() // ensure cart guest id exists
      router.push(nextUrl)
      router.refresh()
    } catch (err) {
      toast.error('Authentication failed', err.message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isLogin ? "Welcome back. We've missed you." : 'Join us for faster checkout and order tracking.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {!isLogin && (
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Name (optional)</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
          </div>
        )}
        <div>
          <Label className="text-xs font-medium mb-1.5 block">Email</Label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-medium">Password</Label>
            {isLogin && (
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Forgot?
              </Link>
            )}
          </div>
          <Input
            type="password"
            required
            minLength={isLogin ? 1 : 8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={isLogin ? 'Your password' : 'Min 8 characters'}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground mt-5">
        {isLogin ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-foreground hover:underline">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Demo accounts: <code className="bg-muted px-1.5 py-0.5 rounded">admin@shopflar.dev / admin12345</code> · <code className="bg-muted px-1.5 py-0.5 rounded">customer@example.com / customer123</code>
      </p>
    </div>
  )
}
