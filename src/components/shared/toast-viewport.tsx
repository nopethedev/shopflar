'use client'
import { useToastStore } from '@/lib/toast'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ToastViewport() {
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-card fade-in ${
            t.variant === 'success' ? 'border-emerald-200 bg-emerald-50' :
            t.variant === 'error' ? 'border-rose-200 bg-rose-50' : 'border-border'
          }`}
        >
          {t.variant === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />}
          {t.variant === 'error' && <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />}
          {t.variant === 'default' && <Info className="h-5 w-5 text-foreground mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            {t.title && <p className="font-medium text-sm text-foreground">{t.title}</p>}
            {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
