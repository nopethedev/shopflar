'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { contentPositionClasses, overlayStyleFor } from '@/lib/section-style'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

// ===== Slideshow =====
// Auto-advancing, swipeable image slideshow with per-slide captions & CTAs
export function SlideshowSection({ config }) {
  const slides = (config.slides || []).filter(s => s.image || s.title)
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)
  const height = config.height || '70vh'
  const heightMobile = config.heightMobile || '50vh'
  const speed = Math.max(2, parseInt(config.interval) || 5)
  const dark = config.overlay !== 'light'
  const overlayStyle = overlayStyleFor(config)

  useEffect(() => {
    if (slides.length < 2 || config.autoplay === false) return
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % slides.length)
    }, speed * 1000)
    return () => clearInterval(timerRef.current)
  }, [slides.length, speed, config.autoplay])

  if (slides.length === 0) return null

  const go = (i) => setIndex((i + slides.length) % slides.length)
  const slide = slides[index]

  return (
    <section
      className="sec-hero relative w-full overflow-hidden group"
      style={{ '--hero-h': height, '--hero-h-mobile': heightMobile }}
    >
      {/* Backgrounds (crossfade) */}
      {slides.map((s, i) => (
        <img
          key={i}
          src={s.image}
          alt={s.title || ''}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div
        className={`absolute inset-0 ${overlayStyle ? '' : dark ? 'bg-gradient-to-b from-black/30 via-black/40 to-black/60' : 'bg-gradient-to-b from-white/30 via-white/40 to-white/60'}`}
        style={overlayStyle || undefined}
      />

      {/* Caption */}
      <div className={`absolute inset-0 flex ${contentPositionClasses(config.contentPosition).className}`}>
        <div className="container-ecom">
          <div className={`max-w-2xl ${dark ? 'text-white' : 'text-foreground'}`}>
            {slide.eyebrow && <p className="text-xs font-medium uppercase tracking-[0.2em] mb-3 opacity-80">{slide.eyebrow}</p>}
            <h2
              key={index}
              className="sec-hero-title font-bold leading-[1.05] tracking-tight"
              style={{ fontFamily: 'var(--font-display), Inter, sans-serif', '--hero-title-size': '56px', '--hero-title-mobile': '38px' }}
            >
              {slide.title}
            </h2>
            {slide.subtitle && <p className="mt-4 text-base md:text-lg opacity-85 max-w-xl leading-relaxed">{slide.subtitle}</p>}
            {slide.buttonText && (
              <Button asChild size="lg" className={`mt-7 ${dark ? 'bg-white text-black hover:bg-white/90' : ''}`}>
                <Link href={slide.buttonUrl || '/products'}>{slide.buttonText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Arrows */}
      {slides.length > 1 && config.arrows !== false && (
        <>
          <button onClick={() => go(index - 1)} aria-label="Previous slide" className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(index + 1)} aria-label="Next slide" className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ===== Countdown =====
// Urgency timer that counts down to a launch / sale end. Hides itself after
// the deadline unless "keep visible" is enabled.
export function CountdownSection({ config }) {
  const target = config.endDate ? new Date(config.endDate).getTime() : 0
  const [now, setNow] = useState(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!target || !config.endDate) return null
  if (!now) return <div style={{ height: 8 }} />

  const diff = target - now
  if (diff <= 0 && config.expiredAction !== 'show-zero') return null

  const clamped = Math.max(0, diff)
  const days = Math.floor(clamped / 86400000)
  const hours = Math.floor((clamped % 86400000) / 3600000)
  const mins = Math.floor((clamped % 3600000) / 60000)
  const secs = Math.floor((clamped % 60000) / 1000)

  const bg = config.bg || '#1a1a1a'
  const color = config.color || '#ffffff'
  const units = [
    { v: days, l: 'Days' }, { v: hours, l: 'Hours' },
    { v: mins, l: 'Minutes' }, { v: secs, l: 'Seconds' }
  ]

  return (
    <section className="py-10" style={{ backgroundColor: bg, color }}>
      <div className="container-ecom text-center">
        {config.eyebrow && <p className="text-xs uppercase tracking-[0.25em] opacity-70 mb-2">{config.eyebrow}</p>}
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          {config.title || 'Sale ends soon'}
        </h2>
        <div className="mt-6 flex items-center justify-center gap-3 md:gap-5">
          {units.map((u, i) => (
            <div key={i} className="min-w-[64px] md:min-w-[84px] rounded-xl border px-3 py-3 md:px-4 md:py-4" style={{ borderColor: `${color}33`, backgroundColor: `${color}0d` }}>
              <p className="text-2xl md:text-4xl font-bold tabular-nums leading-none" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
                {String(u.v).padStart(2, '0')}
              </p>
              <p className="mt-1.5 text-[10px] md:text-xs uppercase tracking-wider opacity-70">{u.l}</p>
            </div>
          ))}
        </div>
        {config.buttonText && diff > 0 && (
          <Button asChild size="lg" className="mt-7" style={{ backgroundColor: color, color: bg }}>
            <Link href={config.buttonUrl || '/products'}>{config.buttonText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        )}
      </div>
    </section>
  )
}
