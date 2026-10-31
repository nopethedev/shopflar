'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { MailCheck, MailX, Loader2 } from 'lucide-react'

// Consumes the emailed verification token:
//   POST /api/auth/verify-email { token } → verifies + signs the user in
export function VerifyEmailClient() {
  const router = useRouter()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [message, setMessage] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token found in the link. Please use the exact link from your email.')
      return
    }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'Verification failed')
        setStatus('success')
        toast.success('Email verified!', d.user?.email)
        // Session was created server-side — refresh so the header shows the user
        setTimeout(() => {
          router.push('/account')
          router.refresh()
        }, 1800)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [router])

  if (status === 'verifying') {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight mt-5" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Verifying your email…
        </h1>
        <p className="text-sm text-muted-foreground mt-2">This only takes a second.</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
          <MailCheck className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          Email verified!
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your account is now active. Taking you to your dashboard…
        </p>
        <Button className="mt-6" asChild>
          <Link href="/account">Go to account</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center py-8">
      <div className="mx-auto w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-5">
        <MailX className="h-7 w-7 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
        Verification failed
      </h1>
      <p className="text-sm text-muted-foreground mt-2">{message}</p>
      <div className="mt-6 space-y-2">
        <Button className="w-full" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/signup">Create a new account</Link>
        </Button>
      </div>
    </div>
  )
}
