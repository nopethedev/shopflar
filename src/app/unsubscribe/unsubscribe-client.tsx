'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function UnsubscribeClient({ token }) {
  const [state, setState] = useState(token ? 'confirm' : 'invalid') // confirm | done | error | invalid
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const d = await r.json()
      if (r.ok) {
        setEmail(d.email || '')
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5">
          {state === 'done' ? (
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : state === 'error' || state === 'invalid' ? (
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          )}
        </div>

        {state === 'confirm' && (
          <>
            <h1 className="text-xl font-bold text-zinc-900">Unsubscribe from emails?</h1>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              You will stop receiving newsletters and marketing emails. Order confirmations and
              receipts for purchases you make will still be sent.
            </p>
            <Button onClick={confirm} disabled={busy} className="mt-6 w-full h-11">
              {busy ? 'Working…' : 'Confirm unsubscribe'}
            </Button>
          </>
        )}

        {state === 'done' && (
          <>
            <h1 className="text-xl font-bold text-zinc-900">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {email ? <><strong className="text-zinc-700">{email}</strong> will no longer receive newsletters.</> : 'This email address will no longer receive newsletters.'}
              {' '}Changed your mind? You can always subscribe again on our website.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-bold text-zinc-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-500">Please try again — if it keeps failing, the link may be broken.</p>
            <Button onClick={confirm} disabled={busy} variant="outline" className="mt-6 w-full h-11">Try again</Button>
          </>
        )}

        {state === 'invalid' && (
          <>
            <h1 className="text-xl font-bold text-zinc-900">Link not valid</h1>
            <p className="mt-2 text-sm text-zinc-500">
              This unsubscribe link is missing or invalid. Please use the link included at the bottom of the email.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
