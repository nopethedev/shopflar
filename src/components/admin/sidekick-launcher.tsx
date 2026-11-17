'use client'
import { useEffect, useState } from 'react'
import { Sparkles, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SidekickChat } from './sidekick-chat'

export function SidekickLauncher() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openSidekick = () => setOpen(true)
    window.addEventListener('sidekick:open', openSidekick)
    return () => window.removeEventListener('sidekick:open', openSidekick)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-black/20 hover:bg-[#303030] transition-colors"
        aria-label="Open Sidekick assistant"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Sidekick</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="admin-shell w-full sm:max-w-[460px] p-0 flex flex-col gap-0 border-l border-[#e3e3e3]"
        >
          <SheetTitle className="sr-only">Sidekick assistant</SheetTitle>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e3e3] pr-12">
            <div>
              <p className="text-[13px] font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Sidekick
              </p>
              <p className="text-[11px] text-[#8a8a8a]">Ask about products, orders, copy or growth.</p>
            </div>
            <Link
              href="/admin/ai"
              onClick={() => setOpen(false)}
              className="text-[11px] text-[#616161] hover:text-[#1a1a1a] inline-flex items-center gap-1"
            >
              Full page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <SidekickChat variant="panel" onSettingsChange={() => {}} />
        </SheetContent>
      </Sheet>
    </>
  )
}
