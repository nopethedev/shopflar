'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { Gift, Sparkles, Package, Dices, Copy, Check, PartyPopper, Info } from 'lucide-react'

// ============================================================
// Mystery box reveal — shown on the order success page when the
// order contained mystery crate products. The server already
// decided the contents at order time (order.mysteryReveals).
// ============================================================

const animCss = `
@keyframes sf-pop-in {
  0% { opacity: 0; transform: scale(0.6) translateY(14px); }
  70% { transform: scale(1.06) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes sf-box-wiggle {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-6deg); }
  40% { transform: rotate(6deg); }
  60% { transform: rotate(-4deg); }
  80% { transform: rotate(4deg); }
}
@keyframes sf-sparkle {
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.12); }
}
.sf-reveal-item { animation: sf-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.sf-box-wiggle { animation: sf-box-wiggle 0.6s ease-in-out infinite; }
.sf-sparkle { animation: sf-sparkle 1.6s ease-in-out infinite; }
`

function RevealItem({ item, delay, tag }) {
  return (
    <div
      className="sf-reveal-item flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-background text-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          : <Package className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight break-words">{item.name}</p>
        {item.quantity > 1 && <p className="text-[11px] text-muted-foreground mt-0.5">×{item.quantity}</p>}
        {tag && <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{tag}</p>}
      </div>
    </div>
  )
}

function SingleReveal({ reveal, index }) {
  const [opened, setOpened] = useState(false)
  const surprises = reveal.surprises || []
  const guaranteed = reveal.guaranteed || []
  const all = [
    ...guaranteed.map(g => ({ ...g, tag: 'guaranteed' })),
    ...surprises.map(s => ({ ...s, quantity: 1, tag: 'lucky draw' }))
  ]

  return (
    <div className="rounded-xl border-2 border-dashed border-amber-300/60 bg-amber-50/40 p-5">
      {!opened ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg sf-box-wiggle">
              {reveal.crateImageUrl
                ? <img src={reveal.crateImageUrl} alt={reveal.crateName} className="h-full w-full rounded-2xl object-cover" />
                : <Gift className="h-9 w-9" />}
            </div>
            <Sparkles className="sf-sparkle h-5 w-5 text-amber-500 absolute -top-2 -right-2" />
          </div>
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              {reveal.crateName}{reveal.quantity > 1 ? ` ×${reveal.quantity}` : ''}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              You won {all.length} item{all.length !== 1 ? 's' : ''} — tap the box to see what&apos;s inside!
            </p>
          </div>
          <Button onClick={() => setOpened(true)} className="mt-1">
            <Gift className="h-4 w-4 mr-2" /> Open your mystery box
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
              {reveal.crateName}{reveal.quantity > 1 ? ` ×${reveal.quantity}` : ''} — here&apos;s what you got!
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {all.map((item, i) => (
              <RevealItem key={`${item.name}-${i}`} item={item} delay={i * 160} tag={item.tag} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MysteryReveal({ reveals }) {
  if (!reveals || reveals.length === 0) return null
  return (
    <section className="mt-8">
      <style dangerouslySetInnerHTML={{ __html: animCss }} />
      <h2 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
        <Gift className="h-5 w-5 text-amber-500" /> Mystery box
      </h2>
      <p className="text-sm text-muted-foreground mb-4">Your order included a mystery box. Let&apos;s see what you won!</p>
      <div className="space-y-4">
        {reveals.map((r, i) => <SingleReveal key={i} reveal={r} index={i} />)}
      </div>
    </section>
  )
}

// ============================================================
// Free Order Dice — roll on screen after payment. The result is
// rolled & stored server-side (exactly once); this component just
// plays it back. Winners get a coupon for the order total.
// ============================================================

const diceCss = `
@keyframes sf-dice-shake {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-5px, -3px) rotate(-14deg); }
  50% { transform: translate(4px, 2px) rotate(11deg); }
  75% { transform: translate(-3px, 4px) rotate(-7deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes sf-win-pop {
  0% { opacity: 0; transform: scale(0.7); }
  70% { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
.sf-dice-rolling { animation: sf-dice-shake 0.28s linear infinite; }
.sf-dice-win { animation: sf-win-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
`

function DiceFace({ value, rolling, won }) {
  // Pips layout per dice value
  const pipMap = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  }
  const pips = pipMap[value] || [4]
  return (
    <div
      className={`h-20 w-20 rounded-xl border-2 bg-background shadow-md grid grid-cols-3 grid-rows-3 p-2.5 ${
        rolling ? 'sf-dice-rolling border-foreground/40' : won ? 'sf-dice-win border-emerald-500' : 'border-border'
      }`}
      aria-label={`Dice showing ${value}`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {pips.includes(i) && <div className={`h-2.5 w-2.5 rounded-full ${won && !rolling ? 'bg-emerald-600' : 'bg-foreground'}`} />}
        </div>
      ))}
    </div>
  )
}

export function DiceGame({ orderId, sides = 6, target = 6, currencySymbol = '$' }) {
  const [phase, setPhase] = useState('idle') // idle | rolling | done | error
  const [display, setDisplay] = useState(1)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const roll = async () => {
    if (phase !== 'idle') return
    setPhase('rolling')
    // Tumble faces while the server decides
    timerRef.current = setInterval(() => {
      setDisplay(1 + Math.floor(Math.random() * sides))
    }, 110)
    try {
      const r = await fetch('/api/orders/dice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const d = await r.json()
      if (!r.ok || !d.enabled || !d.rolled) {
        // Dice not available (disabled, unpaid, or already settled elsewhere)
        clearInterval(timerRef.current)
        setPhase('error')
        return
      }
      // Let the tumble play for a moment before landing on the real result
      await new Promise(res => setTimeout(res, 2200))
      clearInterval(timerRef.current)
      setDisplay(d.roll)
      setResult(d)
      setPhase('done')
    } catch {
      clearInterval(timerRef.current)
      setPhase('error')
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(result.couponCode)
      setCopied(true)
      toast.success('Coupon code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy', 'Please copy the code manually.')
    }
  }

  if (phase === 'error') return null // dice quietly unavailable — never break the page

  return (
    <section className="mt-8">
      <style dangerouslySetInnerHTML={{ __html: diceCss }} />
      <div className="rounded-xl border-2 border-border bg-gradient-to-b from-muted/60 to-transparent p-6">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-display), Inter, sans-serif' }}>
          <Dices className="h-5 w-5" /> Lucky Dice
        </h2>

        {phase === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground mt-1">
              Roll a <span className="font-semibold text-foreground">{target}</span> on a {sides}-sided dice and your
              order is <span className="font-semibold text-foreground">on us</span> — you&apos;ll get a coupon for the full amount you paid.
            </p>
            <div className="flex items-center gap-5 mt-5">
              <DiceFace value={target} rolling={false} won={false} />
              <Button size="lg" onClick={roll}>
                <Dices className="h-5 w-5 mr-2" /> Roll the dice
              </Button>
            </div>
          </>
        )}

        {phase === 'rolling' && (
          <>
            <p className="text-sm text-muted-foreground mt-1 animate-pulse">Rolling…</p>
            <div className="mt-5"><DiceFace value={display} rolling won={false} /></div>
          </>
        )}

        {phase === 'done' && result && (
          <div className="mt-2">
            {result.won ? (
              <>
                <p className="text-sm text-muted-foreground mt-1">
                  You rolled a <span className="font-semibold text-foreground">{result.roll}</span> — that&apos;s the winning number! 🎉
                </p>
                <div className="mt-4 flex items-center gap-5 flex-wrap">
                  <DiceFace value={result.roll} rolling={false} won />
                  <div className="sf-dice-win flex-1 min-w-[240px]">
                    <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <PartyPopper className="h-4 w-4 text-emerald-600" />
                        Jackpot! Your order is free — here&apos;s your coupon ({currencySymbol}{Number(result.couponValue ?? 0).toFixed(2)})
                      </p>
                      {result.couponCode ? (
                        <div className="mt-3 flex items-center gap-2">
                          <code className="font-mono text-lg font-bold tracking-widest bg-background border border-border rounded-md px-3 py-1.5">
                            {result.couponCode}
                          </code>
                          <Button variant="outline" size="sm" onClick={copyCode}>
                            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">Your coupon code has been emailed to you.</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">Single use. A copy of the code was sent to your email.</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-1">
                  You rolled a <span className="font-semibold text-foreground">{result.roll}</span> — you needed a{' '}
                  <span className="font-semibold text-foreground">{result.target}</span>. Better luck next order!
                </p>
                <div className="mt-4"><DiceFace value={result.roll} rolling={false} won={false} /></div>
              </>
            )}
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground mt-5">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              {result.imprint || "Doesn't refund — if you win, you get a coupon for the same price."}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
