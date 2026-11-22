'use client'
// Loads third-party embeds on the storefront. Analytics and marketing embeds
// wait for the visitor's cookie choice; functional ones (chat, custom code)
// load straight away. Nothing runs inside the theme editor preview.
import { useEffect, useState } from 'react'
import type { Embed } from '@/lib/embeds'
import { MessageCircle } from 'lucide-react'

const CONSENT_KEY = 'shopflar_cookie_consent'
export const CONSENT_EVENT = 'shopflar:consent'

function hasFullConsent() {
  try {
    const v = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null')
    return v?.consent === 'all'
  } catch { return false }
}

function inject(embed: Embed, where: HTMLElement) {
  const mark = (el: HTMLElement) => { el.setAttribute('data-sf-embed', embed.id); return el }
  for (const s of embed.scripts) {
    const el = document.createElement('script')
    if (s.src) el.src = s.src
    if (s.inline) el.text = s.inline
    for (const [k, v] of Object.entries(s.attrs || {})) el.setAttribute(k, v)
    where.appendChild(mark(el))
  }
  // Raw HTML: re-create script tags so the browser executes them
  const place = (html: string | undefined, target: HTMLElement) => {
    if (!html) return
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    tpl.content.childNodes.forEach(node => {
      if (node.nodeName === 'SCRIPT') {
        const old = node as HTMLScriptElement
        const el = document.createElement('script')
        for (const a of Array.from(old.attributes)) el.setAttribute(a.name, a.value)
        el.text = old.text
        target.appendChild(mark(el))
      } else {
        target.appendChild(node.cloneNode(true))
      }
    })
  }
  place(embed.html?.head, document.head)
  place(embed.html?.body, document.body)
}

export function AppEmbeds({ embeds }: { embeds: Embed[] }) {
  const [consent, setConsent] = useState(false)
  const whatsapp = embeds.find(e => e.whatsapp)?.whatsapp

  useEffect(() => {
    setConsent(hasFullConsent())
    const update = () => setConsent(hasFullConsent())
    window.addEventListener(CONSENT_EVENT, update)
    window.addEventListener('storage', update)
    return () => { window.removeEventListener(CONSENT_EVENT, update); window.removeEventListener('storage', update) }
  }, [])

  useEffect(() => {
    if (window.parent !== window) return // editor preview / embedded frame
    for (const embed of embeds) {
      if (embed.category !== 'essential' && !consent) continue
      if (document.querySelector(`[data-sf-embed="${embed.id}"]`)) continue
      inject(embed, document.head)
    }
  }, [embeds, consent])

  if (!whatsapp) return null
  return (
    <a
      href={whatsapp.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={`fixed bottom-5 ${whatsapp.position === 'left' ? 'left-5' : 'right-5'} z-40 h-14 w-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform`}
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  )
}
