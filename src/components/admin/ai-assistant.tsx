'use client'
import { useState } from 'react'
import { Sparkles, Settings2, AlertTriangle, KeyRound, Check } from 'lucide-react'
import { SidekickChat } from './sidekick-chat'

export function AiAssistant({ storeName, initialSettings }) {
  const [settings, setSettings] = useState(initialSettings)

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">Shopflar Sidekick</p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#1a1a1a]" /> AI Assistant
          </h1>
          <p className="sf-sub mt-0.5">Your merchandising, copywriting and analytics copilot for {storeName}.</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event('sidekick:settings'))}
          className="sf-btn sf-btn-secondary"
        >
          <Settings2 className="h-3.5 w-3.5" /> AI settings
        </button>
      </div>

      {!settings?.hasKey ? (
        <div className="sf-card p-4 border-[#f0d9a8] bg-[#fffaf0] flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#8a4b00] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#5c3300]">Connect your AI provider</p>
            <p className="text-[12px] text-[#8a4b00] mt-0.5">
              Add an API key from OpenAI, Groq, OpenRouter, Together or any OpenAI-compatible endpoint. The key is stored on your server and never exposed to the browser.
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event('sidekick:settings'))}
            className="sf-btn sf-btn-primary shrink-0"
          >
            <KeyRound className="h-3.5 w-3.5" /> Add key
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#616161]">
          <span className="sf-badge sf-badge-success"><Check className="h-3 w-3" /> Connected</span>
          <span className="sf-badge sf-badge-neutral">{settings.model}</span>
          <span className="font-mono">{settings.maskedKey}</span>
          <span className="sf-badge sf-badge-neutral">{settings.source === 'env' ? 'from environment' : 'stored in this store'}</span>
        </div>
      )}

      <SidekickChat variant="page" initialSettings={initialSettings} onSettingsChange={setSettings} />
    </div>
  )
}
