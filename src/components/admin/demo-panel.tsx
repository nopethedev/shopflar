'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FlaskConical, RefreshCw, Clock, Package, ShoppingBag, Users,
  KeyRound, Sparkles, AlertTriangle, Check, ExternalLink, Loader2
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Status = {
  enabled: boolean
  resetMinutes: number
  lastActivity: string | null
  lastReset: string | null
  nextResetAt: string | null
  resets: number
  counts: { products: number; orders: number; customers: number }
  adminEmail: string
  defaultPassword: string | null
  ai: { configured: boolean; model: string; baseUrl: string }
}

function relative(date: string | null) {
  if (!date) return 'never'
  const diff = Date.now() - new Date(date).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  return new Date(date).toLocaleDateString()
}

function useCountdown(target: string | null) {
  const [left, setLeft] = useState<number>(() =>
    target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0
  )
  useEffect(() => {
    if (!target) return
    const tick = () => setLeft(Math.max(0, new Date(target).getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  if (!target) return null
  const total = Math.floor(left / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function DemoPanel({ status }: { status: Status }) {
  const router = useRouter()
  const [resetting, setResetting] = useState(false)
  const countdown = useCountdown(status.nextResetAt)

  const reset = async () => {
    if (!confirm('Reset the demo now? All changes made in this demo will be deleted and sample data restored.')) return
    setResetting(true)
    try {
      const r = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Reset failed')
      toast.success('Demo reset', 'Sample data restored. Please sign in again.')
      setTimeout(() => router.push('/login?next=/admin'), 600)
    } catch (e: any) {
      toast.error('Could not reset demo', e.message)
      setResetting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Demo controls</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a] flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> Demo mode
            <span className={cn('sf-badge', status.enabled ? 'sf-badge-success' : 'sf-badge-neutral')}>
              {status.enabled ? 'On' : 'Off'}
            </span>
          </h1>
          <p className="sf-sub mt-0.5">
            {status.enabled
              ? `This store is disposable. It resets itself after ${status.resetMinutes} minutes with no activity.`
              : 'Demo mode is disabled. This store behaves like a normal installation.'}
          </p>
        </div>
        {status.enabled && (
          <button onClick={reset} disabled={resetting} className="sf-btn sf-btn-primary disabled:opacity-50">
            {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reset demo now
          </button>
        )}
      </div>

      {!status.enabled ? (
        <div className="sf-card p-4 border-[#f0d9a8] bg-[#fffaf0]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-[#8a4b00] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#5c3300]">Enable demo mode in your environment</p>
              <p className="text-[12px] text-[#8a4b00] mt-1">
                Set these variables in <code className="font-mono">.env</code> (or your host's environment) and restart the server.
                Enabling this wipes and reseeds the database on first use, so only do it on a disposable database.
              </p>
              <pre className="mt-3 rounded-lg bg-white/70 border border-[#f0d9a8] p-3 text-[11px] font-mono text-[#5c3300] overflow-x-auto">{`DEMO_MODE="true"
DEMO_RESET_MINUTES="30"
# optional:
DEMO_ADMIN_EMAIL="demo@shopflar.dev"
DEMO_ADMIN_PASSWORD="demo12345"`}</pre>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={Package} label="Products" value={status.counts.products} />
            <Stat icon={ShoppingBag} label="Orders" value={status.counts.orders} />
            <Stat icon={Users} label="Customers" value={status.counts.customers} />
            <Stat icon={RefreshCw} label="Resets" value={status.resets} />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="sf-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-[#616161]" />
                <p className="text-[12px] font-semibold text-[#1a1a1a]">Inactivity timer</p>
              </div>
              <p className="text-[26px] font-semibold tracking-tight text-[#1a1a1a] tabular-nums">
                {countdown || '—'}
              </p>
              <p className="text-[11px] text-[#8a8a8a] mt-1">
                {countdown === '0:00'
                  ? 'The next request will reset the demo.'
                  : `Until reset · ${status.resetMinutes} min window`}
              </p>
              <div className="mt-3 pt-3 border-t border-[#efefef] space-y-1 text-[11px] text-[#616161]">
                <p>Last activity: <span className="text-[#1a1a1a]">{relative(status.lastActivity)}</span></p>
                <p>Last reset: <span className="text-[#1a1a1a]">{relative(status.lastReset)}</span></p>
              </div>
            </div>

            <div className="sf-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-3.5 w-3.5 text-[#616161]" />
                <p className="text-[12px] font-semibold text-[#1a1a1a]">Demo login</p>
              </div>
              <div className="rounded-lg bg-[#f7f7f7] px-3 py-2 font-mono text-[12px] text-[#303030]">
                <p>{status.adminEmail}</p>
                <p className="text-[#616161]">{status.defaultPassword || '•••••••• (set via DEMO_ADMIN_PASSWORD)'}</p>
              </div>
              <p className="text-[11px] text-[#8a8a8a] mt-2">
                Visitors use this account to try the admin and the theme editor. Resetting recreates it.
              </p>
              <Link href="/" target="_blank" className="sf-btn sf-btn-secondary mt-3 !h-7 !text-[11px]">
                Open storefront <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="sf-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="h-7 w-7 rounded-lg bg-[#f1f1f1] flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#1a1a1a]">Sidekick AI</p>
                  <p className="text-[11px] text-[#616161] truncate">
                    {status.ai.configured
                      ? `API key configured · ${status.ai.model}`
                      : `No API key configured · ${status.ai.model}`}
                  </p>
                  <p className="text-[10px] text-[#8a8a8a] font-mono truncate">{status.ai.baseUrl}</p>
                </div>
              </div>
              <span className={cn('sf-badge shrink-0', status.ai.configured ? 'sf-badge-success' : 'sf-badge-neutral')}>
                {status.ai.configured ? <><Check className="h-3 w-3" /> Ready</> : 'Not configured'}
              </span>
            </div>
          </div>

          <div className="sf-card p-4 border-[#f5c6c0]">
            <p className="text-[12px] font-semibold text-[#8e1f16]">Danger zone</p>
            <p className="text-[11px] text-[#616161] mt-1">
              Reset deletes every product, order, customer and setting created in this demo, then restores the
              sample catalogue. The demo admin is signed out.
            </p>
            <button onClick={reset} disabled={resetting} className="sf-btn sf-btn-secondary mt-3 !text-[#8e1f16] disabled:opacity-50">
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Reset and reseed
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="sf-card p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#8a8a8a]">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-[21px] font-semibold text-[#1a1a1a] mt-1 tabular-nums">{value}</p>
    </div>
  )
}
