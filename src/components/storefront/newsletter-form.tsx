'use client'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { CheckCircle2 } from 'lucide-react'

export function NewsletterForm({ variant = 'default' }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      toast.error('Valid email required')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'STOREFRONT' })
      })
      const d = await r.json()
      if (r.ok) {
        if (d.alreadySubscribed) {
          toast.info('Already subscribed', 'You\'re already on our list!')
        } else if (d.welcomeEmailSent) {
          toast.success('Subscribed!', 'Check your email for a welcome discount code.')
          setDone(true)
        } else if (d.welcomeEmailFailed) {
          toast.success('Subscribed!', 'Welcome email could not be sent — contact us for your discount.')
          setDone(true)
        } else {
          toast.success('Subscribed!', 'Thanks for joining.')
          setDone(true)
        }
        setEmail('')
      } else {
        throw new Error(d.error || 'Failed')
      }
    } catch (e) {
      toast.error('Failed', e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span>You&apos;re subscribed! Check your inbox.</span>
      </div>
    )
  }

  if (variant === 'dark') {
    return (
      <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 h-11 px-4 rounded-md bg-background/10 border border-background/20 text-background placeholder:text-background/60 focus:outline-none focus:ring-2 focus:ring-background/40"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-11 px-6 rounded-md bg-background text-foreground font-medium hover:bg-background/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 h-11 px-4 rounded-md border border-input bg-background"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={submitting}
        className="h-11 px-6 rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  )
}
