'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'shopflar_cookie_consent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      // Small delay so banner doesn't flash on page load
      const id = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(id)
    }
  }, [])

  const save = (consent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ consent, ts: Date.now() }))
    setVisible(false)
    // Optional: send to server for record-keeping
    fetch('/api/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent })
    }).catch(() => {})
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-background shadow-lg p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">We use cookies</h3>
            <p className="text-xs text-muted-foreground mt-1">
              We use essential cookies to make our site work, and optional cookies to improve your experience.
              You can choose which cookies to allow. See our{' '}
              <Link href="/cookies" className="text-foreground hover:underline">Cookie Policy</Link> for details.
            </p>

            {showDetails && (
              <div className="mt-3 space-y-2 text-xs">
                <label className="flex items-start gap-2 p-2 rounded border border-border">
                  <input type="checkbox" checked disabled className="mt-0.5" />
                  <div>
                    <strong>Essential</strong> — required for cart, checkout, and login
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2 rounded border border-border">
                  <input type="checkbox" id="cc-analytics" defaultChecked className="mt-0.5" />
                  <div>
                    <strong>Analytics</strong> — anonymous usage stats to help us improve
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2 rounded border border-border">
                  <input type="checkbox" id="cc-marketing" defaultChecked={false} className="mt-0.5" />
                  <div>
                    <strong>Marketing</strong> — personalized ads and tracking
                  </div>
                </label>
              </div>
            )}
          </div>
          <button
            onClick={() => save('essential')}
            aria-label="Dismiss cookie banner"
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide details' : 'Customize'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => save('essential')}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => save('all')}>
            Allow all
          </Button>
        </div>
      </div>
    </div>
  )
}
