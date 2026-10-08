'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, Mail, Clock, Sparkles } from 'lucide-react'
import { NewsletterForm } from './newsletter-form'
import { toast } from '@/lib/toast'

export function StoreModePage({ mode, config, settings }) {
  const [showLogin, setShowLogin] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)

  // Countdown timer for prelaunch mode
  useEffect(() => {
    if (mode !== 'prelaunch' || !config.launchDate) return
    const launchDate = new Date(config.launchDate).getTime()
    const update = () => {
      const now = Date.now()
      const diff = launchDate - now
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ days, hours, minutes, seconds, expired: false })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [mode, config.launchDate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background image */}
      {config.image && (
        <div className="absolute inset-0 z-0">
          <img src={config.image} alt="" className="h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-2xl px-6 py-12 text-center">
        {mode === 'maintenance' ? (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-6">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              {config.title || 'Under Maintenance'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              {config.message || 'We\'ll be back shortly. Thanks for your patience.'}
            </p>
          </>
        ) : (
          // Pre-launch mode
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-foreground text-background flex items-center justify-center mb-6">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              {config.title || 'Something Amazing Is Coming'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              {config.subtitle || 'We\'re putting the finishing touches on our store. Be the first to know when we launch.'}
            </p>

            {/* Countdown */}
            {timeLeft && !timeLeft.expired ? (
              <div className="flex items-center justify-center gap-4 mb-10">
                {[
                  { label: 'Days', value: timeLeft.days },
                  { label: 'Hours', value: timeLeft.hours },
                  { label: 'Minutes', value: timeLeft.minutes },
                  { label: 'Seconds', value: timeLeft.seconds }
                ].map((unit) => (
                  <div key={unit.label} className="text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-2xl md:text-3xl font-bold tabular-nums">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{unit.label}</p>
                  </div>
                ))}
              </div>
            ) : timeLeft?.expired ? (
              <div className="mb-10 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                🎉 We&apos;re live! Refreshing...
              </div>
            ) : null}

            {/* Email signup */}
            <div className="max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" /> Get notified when we launch
              </p>
              <NewsletterForm variant="default" />
            </div>
          </>
        )}
      </div>

      {/* Secretive login button — bottom right corner */}
      <SecretiveLoginButton />
    </div>
  )
}

// Small, unobtrusive login button in the corner
// Intentionally subtle so visitors don't notice it, but admin can find it
function SecretiveLoginButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href="/login"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-3 right-3 z-50 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-muted hover:w-auto hover:px-4 hover:h-10 group"
      aria-label="Admin login"
      title="Admin"
    >
      <Lock className={`h-3.5 w-3.5 transition-opacity ${hovered ? 'opacity-0' : 'opacity-30'}`} />
      <span className={`absolute text-xs font-medium whitespace-nowrap transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        Admin Login
      </span>
    </Link>
  )
}
